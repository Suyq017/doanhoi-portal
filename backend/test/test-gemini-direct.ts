import { GoogleGenAI } from "@google/genai";

async function main() {
    console.log('🧪 Testing Gemini API directly...\n');

    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCjbEJahdXXneoIt7J_nXkXQhcrrMBMAM8';
    console.log(`Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

    const ai = new GoogleGenAI({
        apiKey: apiKey
    });

    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: 'What is the meaning of life?',
    });

    console.log('✅ Response received:');
    console.log(response.embeddings);
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
});
