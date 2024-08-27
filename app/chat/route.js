// import { Pinecone } from "@pinecone-database/pinecone";
// import OpenAI from "openai";
// import axios from "axios";

// const pc = new Pinecone({
//   apiKey: process.env.pinecone_key,
// });

// const openai = new OpenAI({
//   baseURL: "https://openrouter.ai/api/v1",
//   apiKey: process.env.openai_key,
// });

// const model_id = "sentence-transformers/all-MiniLM-L6-v2";
// const hf_token = process.env.embedder_key; // Make sure to store your Hugging Face token in an environment variable

// // Function to generate embeddings using Hugging Face API
// async function generateEmbeddings(texts) {
//   const apiUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/${model_id}`;

//   try {
//     const response = await axios.post(
//       apiUrl,
//       { inputs: texts },
//       { headers: { Authorization: `Bearer ${hf_token}` } }
//     );

//     return response.data; // This will be the embeddings for your texts
//   } catch (error) {
//     console.error("Error generating embeddings: ", error);
//     throw error;
//   }
// }

// const systemPrompt = `
// You are a helpful and knowledgeable assistant designed to help students find professors that match their specific needs. Students will provide queries describing their preferences, and your goal is to recommend the 3 most suitable professors based on the information provided.

// Your responses should include:

// The professor's name.
// The subject they teach.
// A brief summary of why they match the student's query, based on their reviews and ratings.
// Any relevant metadata that supports the recommendation (e.g., average star rating, specific strengths or teaching style).
// For each query:

// Retrieve the 3 most similar professors using the RAG model.
// Provide detailed but concise recommendations that address the student's needs.
// Ensure your tone is friendly, supportive, and informative.
// Your primary goal is to assist students in making informed decisions about which professors to choose based on the provided information.
// `;

// export async function POST(req) {
//   const data = await req.json();

//   const index = pc.index("quickstart");

//   const text = data[data.length - 1].content;
//   const embeddings = await generateEmbeddings([text]);
//   const queryResult = await index.query({
//     vector: embeddings[0], // Using the first embedding generated
//     topK: 3,
//     includeMetadata: true,
//   });

//   let responseText =
//     "Here are the top 3 professors based on your the students query from vector db:\n";

//   queryResult.matches.forEach((match, idx) => {
//     responseText += `${idx + 1}. Professor: ${match.id}, Subject: ${
//       match.metadata.subject
//     }, Stars: ${match.metadata.stars}, Review: "${match.metadata.review}"\n\n`;
//   });

//   lastMessageContent = text + "\n" + responseText;
//   textwithoutlastmessage = data.slice(0, data.length - 1);

//   const completion = await openai.chat.completions.create({
//     model: "meta-llama/llama-3.1-8b-instruct:free",
//     messages: [
//       { role: "system", content: systemPrompt },
//       ...textwithoutlastmessage,
//       { role: "user", content: text },
//     ],
//   });

//   console.log(completion.choices[0].message);

//   return new Response(JSON.stringify(completion.choices[0].message), {
//     status: 200,
//     headers: { "Content-Type": "application/json" },
//   });
// }

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import axios from "axios";

const pc = new Pinecone({
  apiKey: process.env.pinecone_key,
});

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.openai_key,
});

const model_id = "sentence-transformers/all-MiniLM-L6-v2";
const hf_token = process.env.embedder_key;

// Function to generate embeddings using Hugging Face API
async function generateEmbeddings(texts) {
  const apiUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/${model_id}`;

  try {
    const response = await axios.post(
      apiUrl,
      { inputs: texts },
      { headers: { Authorization: `Bearer ${hf_token}` } }
    );

    return response.data; // This will be the embeddings for your texts
  } catch (error) {
    console.error("Error generating embeddings: ", error);
    throw error;
  }
}

const systemPrompt = `
You are a helpful and knowledgeable assistant designed to help students make informed decisions about choosing professors. You will receive a list of professors that match the student's query, including their names, subjects, ratings, and reviews.

Your goal is to:
1. Summarize and refine the recommendations provided.
2. Highlight the strengths of each professor based on the information given.
3. Offer concise advice to help the student choose between the provided options.

Ensure your tone is friendly, supportive, and informative.
`;

export async function POST(req) {
  try {
    const dataInput = await req.json();
    const data = dataInput.data;
    console.log("data console, ", data);

    // Extract the last message (user's query)
    const lastMessage = data[data.length - 1].content;
    console.log("lastMessage: ", lastMessage);

    // Generate embeddings for the last message
    const embeddings = await generateEmbeddings([lastMessage]);
    console.log("embeddings: ", embeddings);

    // Query Pinecone for the most similar professors
    const index = pc.index("quickstart");
    const queryResult = await index.query({
      vector: embeddings[0],
      topK: 3,
      includeMetadata: true,
    });

    console.log("Pinecone Query Result: ", queryResult);

    // Format the Pinecone result into a structured list for OpenAI
    let pineconeText = "Here are the top 3 professors based on your query:\n";
    queryResult.matches.forEach((match, idx) => {
      pineconeText += `${idx + 1}. Professor: ${
        match.metadata.professor
      }, Subject: ${match.metadata.subject}, Stars: ${
        match.metadata.stars
      }\n\n`;
    });

    console.log(pineconeText);

    // Build up the conversation context for the LLM
    const messages = [
      { role: "system", content: systemPrompt },
      ...data, // Previous messages (chat history)
      { role: "assistant", content: pineconeText }, // Pinecone response
    ];

    // Generate the final response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages,
    });
    console.log("OpenAI Completion Response: ", completion.choices[0].message);

    const assistantMessage = completion.choices[0].message.content;
    console.log("assistantMessage: ", assistantMessage);

    // Return the assistant's message to the frontend
    return new Response(
      JSON.stringify({
        message: assistantMessage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in POST handler: ", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
