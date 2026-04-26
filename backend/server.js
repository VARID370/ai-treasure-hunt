const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const personas = [
    "a Mysterious Pirate", "a Medieval Wizard", "a Futuristic Robot", "an Ancient Egyptian Scribe",
    "a Victorian Detective", "a Space Explorer", "a Haunted Ghost", "a Grumpy Mountain Troll",
    "a Sophisticated Spy", "a Time Traveler from 3025", "a Talking Forest Owl", "a Cyberpunk Hacker",
    "a Shakespearean Actor", "a Mad Scientist", "a Zen Monk"
];
const themes = [
    "Nature", "Technology", "History", "Everyday Objects", "Abstract Concepts", "Animals", "Space", 
    "Magic", "Music", "Art", "Food", "Weather", "Time", "Geography", "Literature", "Emotions",
    "Architecture", "Inventions", "Mythology", "Ocean Life", "Desert Secrets", "Cybernetics"
];
const styles = [
    "Rhyming Verse", "Simple Description", "Direct Question", "Short & Punchy", "Friendly Guide", 
    "Straightforward Clues", "Helpful Narrator", "Adventurous Narrative"
];

// Endpoint: Generate a riddle using OpenRouter
app.get('/api/riddle', async (req, res) => {
    try {
        // Force difficulty to 'medium' as requested
        const difficulty = 'easy';
        const exclude = req.query.exclude || '';
        
        const persona = personas[Math.floor(Math.random() * personas.length)];
        const theme = themes[Math.floor(Math.random() * themes.length)];
        const style = styles[Math.floor(Math.random() * styles.length)];
        const randomSeedWord = Math.random().toString(36).substring(7);
        const timestamp = new Date().toISOString();
        
        const complexity = '2 short lines. VERY EASY. No metaphors or complex language. Be extremely direct.';
        
        console.log(`[Riddle Request] Persona: ${persona}, Theme: ${theme}, Style: ${style}`);
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-2.0-flash-001",
            messages: [{
                role: "system",
                content: `You are ${persona}. You generate high-quality, atmospheric but VERY EASY riddles. Your style is ${style}.`
            }, {
                role: "user",
                content: `Generate an extremely easy, high-quality riddle for a treasure hunt.
                
                LEVEL GUIDELINES:
                - Difficulty: VERY EASY (for children or beginners)
                - Length: ${complexity}
                - Theme: ${theme}
                
                RULES:
                1. FORBIDDEN ANSWERS: [${exclude}].
                2. The answer MUST be a single, very common object (e.g., "sun", "chair", "water").
                3. Use simple, direct clues that a child could understand.
                4. DO NOT be cryptic.
                5. Respond ONLY with a JSON object: {"riddle": "...", "answer": "...", "clue": "..."}`
            }],
            response_format: { type: "json_object" },
            temperature: 0.8,
            max_tokens: 250
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Treasure Hunt'
            }
        });

        const data = JSON.parse(response.data.choices[0].message.content);
        console.log(`[Level: ${difficulty}] Answer: ${data.answer}`);
        res.json(data);
    } catch (error) {
        console.error("Error generating riddle:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to connect to OpenRouter." });
    }
});

// Endpoint: AI Chatbot for hints
app.post('/api/chat', async (req, res) => {
    try {
        const { message, riddle, answer } = req.body;
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-2.0-flash-001",
            messages: [{
                role: "user",
                content: `You are a helpful AI Guide in a treasure hunt game. Riddle: "${riddle}", Answer: "${answer}". Player says: "${message}". Provide a helpful but cryptic hint (1-2 sentences). Do not say the answer word.`
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Treasure Hunt'
            }
        });

        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Error in chat:", error.response?.data || error.message);
        res.status(500).json({ error: "The AI guide is offline." });
    }
});

// Endpoint: Generate a victory story
app.get('/api/reward', async (req, res) => {
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-2.0-flash-001",
            messages: [{
                role: "user",
                content: `Generate an epic, legendary 2-sentence description of a treasure found by a player who just finished a difficult AI treasure hunt. Describe glowing gems, rare gold, and a mythical artifact.`
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'AI Treasure Hunt'
            }
        });

        res.json({ story: response.data.choices[0].message.content });
    } catch (error) {
        res.json({ story: "You found a legendary chest overflowing with shimmering gold and ancient jewels!" });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
