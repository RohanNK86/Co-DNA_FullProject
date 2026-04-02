import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: "YOUR_ANTHROPIC_API_KEY", // 🔴 paste your API key here
});

async function run() {
  try {
    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: "Explain this code: for(i=0;i<5;i++){ console.log(i); }"
        }
      ]
    });

    console.log("✅ Response:\n");
    console.log(response.content[0].text);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

run();