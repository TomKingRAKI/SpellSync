import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Difficulty, WordChallenge } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing");
    }
    return new GoogleGenAI({ apiKey });
};

// Topics to force variety
const TOPICS = [
    "Fruits & Vegetables", "Wild Animals", "School Objects", 
    "Colors & Shapes", "Family Members", "Furniture", 
    "Clothing", "Nature & Weather", "Action Verbs", "Emotions", 
    "Vehicles", "Jobs", "Sports", "Body Parts", "Kitchen Items"
];

// Words that are too boring/repetitive to ignore
const BANNED_WORDS = ["cat", "dog", "sun", "book", "pen", "car", "bus", "bed", "red", "blue"];

export const generateWords = async (difficulty: Difficulty): Promise<WordChallenge[]> => {
    const ai = getClient();
    
    // Pick a random topic to ensure variety
    const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    // Customize prompt based on difficulty
    let difficultyPrompt = "";
    switch (difficulty) {
        case Difficulty.EASY: 
            difficultyPrompt = `simple English words (3-6 letters) related to the topic '${randomTopic}'`; 
            break;
        case Difficulty.MEDIUM: 
            difficultyPrompt = "moderately challenging English words (6-9 letters)"; 
            break;
        case Difficulty.HARD: 
            difficultyPrompt = "difficult English words, perhaps with silent letters or double consonants"; 
            break;
        case Difficulty.INSANE: 
            difficultyPrompt = "extremely obscure or scientific English words that are notoriously hard to spell"; 
            break;
    }

    const prompt = `Generate a list of 5 unique ${difficultyPrompt} for a spelling game. 
    
    IMPORTANT RULES:
    1. Do NOT use these words: ${BANNED_WORDS.join(", ")}.
    2. Provide a short, helpful English hint definition for each.
    3. Provide the Polish translation for the word.
    4. Ensure the words are suitable for a general audience.
    5. Words must be distinct from each other.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        definition: { type: Type.STRING },
                        polishTranslation: { type: Type.STRING, description: "The word translated to Polish" }
                    },
                    required: ["word", "definition", "polishTranslation"]
                }
            }
        }
    });

    if (response.text) {
        return JSON.parse(response.text) as WordChallenge[];
    }
    return [];
};

export const generatePronunciation = async (text: string): Promise<string | null> => {
    const ai = getClient();
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Please say the word: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deep, clear voice
                    },
                },
            },
        });

        // Extract base64 audio
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;

    } catch (error) {
        console.error("TTS Generation failed", error);
        return null;
    }
};