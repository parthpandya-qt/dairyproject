import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export async function POST(request: Request) {
  let modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let client: Client | null = null;
  
  try {
    const userId = await getCurrentUserId();
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid chat history format." }, { status: 400 });
    }

    // 1. Resolve API Key (from process.env)
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "") {
      return NextResponse.json({
        error: "Gemini API Key is missing or set to a placeholder. Please configure your actual API Key in the GEMINI_API_KEY variable in your .env.local file."
      }, { status: 401 });
    }

    // 2. Initialize and connect to the standalone MCP server over stdio
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.resolve(process.cwd(), "scripts/mcp_server.mjs")],
      env: {
        DATABASE_URL: process.env.DATABASE_URL || "",
        DAIRY_USER_ID: String(userId),
        MCP_AUTH_TOKEN: process.env.MCP_SHARED_SECRET || "",
        ...process.env as Record<string, string>, // forward other env variables
      }
    });

    client = new Client(
      { name: "dairy-chatbot-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);

    // 3. Retrieve tools dynamically from the MCP server
    const toolsResult = await client.listTools();
    const mcpTools = toolsResult.tools || [];

    // Map MCP tools to Gemini's expected Function Declarations structure
    const geminiTools = mcpTools.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: "OBJECT",
        properties: t.inputSchema?.properties || {},
        required: t.inputSchema?.required || []
      }
    }));

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Format chat history for Gemini (must start with 'user' role, exclude local system errors)
    const lastUserMessage = messages[messages.length - 1]?.content;
    const formattedMessages = messages.slice(0, -1).filter((m: any) => m.role !== "system");
    const firstUserMsgIndex = formattedMessages.findIndex((m: any) => m.role === "user");
    
    const history = (firstUserMsgIndex === -1 ? [] : formattedMessages.slice(firstUserMsgIndex)).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const userModel = process.env.GEMINI_MODEL;
    const modelsToTry = userModel 
      ? [userModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
      : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    const uniqueModels = Array.from(new Set(modelsToTry));

    let chat: any = null;
    let response: any = null;

    // Connect to chat and run initial message
    for (const currentModelName of uniqueModels) {
      try {
        modelName = currentModelName;
        const modelObj = genAI.getGenerativeModel({
          model: currentModelName,
          systemInstruction: `You are Dairy Flow Pro AI Copilot. You help the dairy administrator manage their business. 
          You have direct access to database tools via Model Context Protocol (MCP) function calls.
          When a user asks you to perform database actions (e.g., list customers, record deliveries/quantities, add extra products, search bills), ALWAYS use the respective tools to fulfill the request.
          If a user asks about dates, relative time like "today", translate it to the current date: ${new Date().toISOString().split('T')[0]}.
          If the user does not specify a year for a date (e.g., "June 1" or "06-01"), always assume the current year (${new Date().getFullYear()}) as the default and pass it to the tools, instead of asking the user for clarification in the chat.
          If a tool response indicates that multiple customers matched (e.g., lists customer options with IDs), you MUST present these options to the user and ask them to select/specify the customer by choosing their ID (customerId) or providing more details. Always ask the user which customer they are targeting when multiple customers share the same name.
          If the user asks for a business report, sales summary, or statistics for a month or overall, use the \`get_business_report\` tool and format the JSON result into a professional, comprehensive, and beautiful Markdown report utilizing styled tables, clear headers, bold metrics, and bulleted lists.
          Once a tool call is executed, summarize the outcome to the user in a friendly, concise, and helpful tone using Markdown formatting.`,
          tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools as any }] : undefined,
        });

        chat = modelObj.startChat({ history });
        response = await chat.sendMessage(lastUserMessage);
        break; // Successfully connected!
      } catch (err: any) {
        console.warn(`Model ${currentModelName} failed or returned error:`, err.message || err);
        if (currentModelName === uniqueModels[uniqueModels.length - 1]) {
          throw err; // Out of fallbacks, throw original error
        }
      }
    }

    let functionCalls = response.response.functionCalls();

    // 4. Tool Execution Loop forwarding requests directly to the MCP server
    while (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];

      for (const call of functionCalls) {
        const name = call.name;
        const args = call.args as any;
        let toolOutput;

        try {
          // Forward the call directly to the MCP server
          const toolResult = await client!.callTool({
            name,
            arguments: args
          }) as any;
          
          // Parse output out of MCP content block
          if (toolResult.content && Array.isArray(toolResult.content) && toolResult.content.length > 0) {
            const firstContent = toolResult.content[0];
            if (firstContent.type === "text") {
              try {
                // If it is JSON text, parse it for clean representation
                toolOutput = JSON.parse(firstContent.text);
              } catch {
                toolOutput = firstContent.text;
              }
            } else {
              toolOutput = firstContent;
            }
          } else {
            toolOutput = toolResult;
          }
        } catch (e: any) {
          console.error(`MCP Tool execution error [${name}]:`, e);
          toolOutput = { error: e.message || "Failed to execute database tool on MCP server." };
        }

        toolResponses.push({
          functionResponse: {
            name,
            response: { result: toolOutput }
          }
        });
      }

      // Send the tool outputs back to Gemini to continue response generation
      response = await chat.sendMessage(toolResponses);
      functionCalls = response.response.functionCalls();
    }

    // Safely close the MCP client process
    try {
      await client.close();
    } catch (e) {
      console.error("Error closing MCP client:", e);
    }

    return NextResponse.json({ content: response.response.text() }, { status: 200 });
  } catch (error: any) {
    // Safely close the MCP client process in case of errors
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error("Error closing MCP client in catch block:", e);
      }
    }

    console.error("AI Copilot Chat Error:", error);
    let errMsg = error.message || "Chatbot assistant encountered an error.";
    if (errMsg.includes("not found") || errMsg.includes("404") || errMsg.includes("API key")) {
      errMsg = `Gemini API Error: The model '${modelName}' returned a 404/Not Found or authentication error. This typically indicates that your API key is invalid or is not authorized to access this model in your region. Please make sure you have supplied a valid Gemini API Key and selected a supported model in the Chatbot settings panel.`;
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
