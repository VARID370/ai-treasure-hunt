const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const API_KEY = process.env.OPENROUTER_API_KEY;

// Rotate through multiple free models so if one is rate-limited, we try the next
const FREE_MODELS = [
    'google/gemma-3-27b-it:free',
    'google/gemma-4-31b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemma-3-12b-it:free',
];

// Try each model in order until one works
async function callAI(messages, jsonMode = false) {
    let lastError;
    for (const model of FREE_MODELS) {
        try {
            const payload = { model, messages, temperature: 0.9, max_tokens: 400 };
            if (jsonMode) payload.response_format = { type: 'json_object' };

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'AI Treasure Hunt',
                    },
                    timeout: 15000,
                }
            );
            const content = response.data.choices?.[0]?.message?.content || '';
            console.log(`[AI] Used model: ${model}`);
            return content;
        } catch (err) {
            const status = err.response?.data?.error?.code || err.code;
            console.warn(`[AI] ${model} failed (${status}), trying next...`);
            lastError = err;
        }
    }
    throw lastError || new Error('All models failed');
}

const personas = [
    'a Mysterious Pirate', 'a Medieval Wizard', 'a Futuristic Robot', 'an Ancient Egyptian Scribe',
    'a Victorian Detective', 'a Space Explorer', 'a Haunted Ghost', 'a Grumpy Mountain Troll',
    'a Sophisticated Spy', 'a Time Traveler from 3025', 'a Talking Forest Owl', 'a Cyberpunk Hacker',
    'a Shakespearean Actor', 'a Mad Scientist', 'a Zen Monk',
];
const themes = [
    'Nature', 'Technology', 'History', 'Everyday Objects', 'Abstract Concepts', 'Animals', 'Space',
    'Magic', 'Music', 'Art', 'Food', 'Weather', 'Time', 'Geography', 'Literature', 'Emotions',
    'Architecture', 'Inventions', 'Mythology', 'Ocean Life', 'Desert Secrets', 'Cybernetics',
];
const styles = [
    'Rhyming Verse', 'Simple Description', 'Direct Question', 'Short & Punchy',
    'Straightforward Clues', 'Helpful Narrator', 'Adventurous Narrative',
];

// ─── Fallback riddle bank (40 hard riddles) ──────────────────────────────────
const FALLBACK_RIDDLES = [
    { riddle: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', answer: 'echo', clue: 'Mountains know my secret — they return what you give them.' },
    { riddle: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps', clue: 'Walk a mile and count what you have created, not what you carried.' },
    { riddle: 'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. What am I?', answer: 'map', clue: 'Explorers unfold me before they venture into the unknown.' },
    { riddle: 'I can fly without wings, I can cry without eyes. Wherever I go, darkness follows me. What am I?', answer: 'cloud', clue: 'I am born over the ocean and die over the land.' },
    { riddle: 'I am not alive, but I can grow. I have no lungs, but I need air. I have no mouth, yet water kills me. What am I?', answer: 'fire', clue: 'Ancient civilizations worshipped me as a god.' },
    { riddle: 'What is always in front of you but cannot be seen?', answer: 'future', clue: 'No prophet has ever truly held me in their hands.' },
    { riddle: 'I have branches, but no fruit, trunk, or leaves. What am I?', answer: 'bank', clue: 'You trust me with your most valued possessions, yet I grow no roots.' },
    { riddle: 'What has a neck but no head, and wears a cap but has no hair?', answer: 'bottle', clue: 'Wine and secrets are both kept inside me.' },
    { riddle: 'I am lighter than a feather, yet the strongest person cannot hold me for more than a few minutes. What am I?', answer: 'breath', clue: 'You need me to speak, yet I escape when you try to hold on.' },
    { riddle: 'What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?', answer: 'river', clue: 'Ancient civilizations were born on my banks.' },
    { riddle: 'I have teeth but cannot bite. I have a spine but cannot fight. I am bound but still take flight in every mind. What am I?', answer: 'book', clue: 'Its words outlive kingdoms and conquerors alike.' },
    { riddle: 'I shrink every time you use me, yet I leave my mark on everything I touch. What am I?', answer: 'pencil', clue: 'Artists and mathematicians bow their heads over me.' },
    { riddle: 'The man who builds me does not want me. The man who buys me does not use me. The man who uses me does not know it. What am I?', answer: 'coffin', clue: 'I am the final bed for the weary.' },
    { riddle: 'What has one eye but cannot see?', answer: 'needle', clue: 'Seamstresses thread me, yet I am blind to their craft.' },
    { riddle: 'What goes through a door but never enters or exits?', answer: 'keyhole', clue: 'Spies press their eye against me to see hidden secrets.' },
    { riddle: 'The more you remove from me, the larger I become. What am I?', answer: 'hole', clue: 'Miners dig me, and time erodes me into mountains.' },
    { riddle: 'What belongs to you but everyone else uses it more than you do?', answer: 'name', clue: 'Parents give it, strangers call it, and gravestones carry it forever.' },
    { riddle: 'I have no life, but I can die. I have no mouth, but rivers flow from me. What am I?', answer: 'snow', clue: 'I blanket the mountains in silence before surrendering to the valley.' },
    { riddle: 'What has thirteen hearts but no other organs?', answer: 'deck of cards', clue: 'Fortune tellers lay me out to read the paths of kings.' },
    { riddle: 'I travel the world but stay in one corner. What am I?', answer: 'stamp', clue: 'Every envelope carries me as its silent passport.' },
    { riddle: 'What flies forever and rests never?', answer: 'wind', clue: 'Sailors pray to me, and trees bow at my command.' },
    { riddle: 'I am a word that becomes shorter when you add two letters to it. What am I?', answer: 'short', clue: 'Think about my very own meaning when extended.' },
    { riddle: 'What is so fragile that saying its name breaks it?', answer: 'silence', clue: 'Monks and graveyards both treasure me equally.' },
    { riddle: 'I look like you but have no bones. I follow your every move but vanish in the dark. What am I?', answer: 'shadow', clue: 'Ancient peoples believed I was a second soul.' },
    { riddle: 'I am a room with no windows, no doors, and no walls. Yet I trap thousands of thoughts inside. What am I?', answer: 'mind', clue: 'Philosophers have spent lifetimes trying to escape or understand me.' },
    { riddle: 'I have no weight, no shape, no color — yet entire wars have been fought over me. What am I?', answer: 'honor', clue: 'Knights wore me as an invisible shield, more precious than their armor.' },
    { riddle: 'I have no mouth, yet I tell all stories. I have no memory, yet I remember everything. What am I?', answer: 'photograph', clue: 'Light is my paintbrush, and time is my canvas.' },
    { riddle: 'The more of me you have, the less you see. What am I?', answer: 'darkness', clue: 'Stars only become visible when I arrive.' },
    { riddle: 'I am the only thing that always tells the truth, even when I am broken. What am I?', answer: 'mirror', clue: 'Narcissus fell in love with my reflection and was ruined by it.' },
    { riddle: 'I have a thousand needles but I do not sew. What am I?', answer: 'porcupine', clue: 'A wanderer of the night whose armor is itself.' },
    { riddle: 'What has no hands but might knock on your door, and if it does, you better open up?', answer: 'opportunity', clue: 'Philosophers say it only visits twice in a lifetime.' },
    { riddle: 'I am cut from the same cloth as time, yet I cannot be sewn back together. What am I?', answer: 'moment', clue: 'Regret is born the instant I slip through your fingers.' },
    { riddle: 'I can be cracked, made, told, and played. What am I?', answer: 'joke', clue: 'A wise fool uses me to speak the hardest truths.' },
    { riddle: 'I run from house to house but never move. I carry voices but have no tongue. What am I?', answer: 'telephone wire', clue: 'String me between two poles and I become a bridge of whispers.' },
    { riddle: 'I grow in the dark, I die in the light. I am a stranger to the sun. What am I?', answer: 'mushroom', clue: 'Ancient alchemists thought I was born from lightning striking earth.' },
    { riddle: 'What can you put in a wooden box that will make it lighter?', answer: 'hole', clue: 'Carpenters know me well, though they never charge for me.' },
    { riddle: 'I am owned by the poor and the rich throws me away. What am I?', answer: 'nothing', clue: 'In mathematics, I am the foundation of all numbers.' },
    { riddle: 'I am not a ghost, but I wear a white sheet. I am not a tongue, but I travel the world. What am I?', answer: 'letter', clue: 'Lovers and soldiers wait desperately for my arrival.' },
    { riddle: 'I am tall when young and short when old. What am I?', answer: 'candle', clue: 'I shed tears of wax to cast away the shadows.' },
    { riddle: 'What has to be broken before you can use it?', answer: 'egg', clue: 'A fragile shell hiding a golden center, waiting to be cracked.' },
];

function getRandomFallback(exclude = []) {
    const excluded = exclude.map(a => a.toLowerCase().trim());
    let pool = FALLBACK_RIDDLES.filter(r => !excluded.includes(r.answer));
    if (pool.length === 0) pool = FALLBACK_RIDDLES;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Riddle Endpoint ──────────────────────────────────────────────────────────
app.get('/api/riddle', async (req, res) => {
    const exclude = req.query.exclude || '';
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const seed = Math.random().toString(36).substring(7);

    console.log(`[Riddle] ${persona} | ${theme} | ${style}`);

    const messages = [
        {
            role: 'system',
            content: `You are ${persona}. You craft deviously clever, hard riddles. Style: ${style}.`,
        },
        {
            role: 'user',
            content: `Generate a HARD original riddle for a treasure hunt game.
Theme: ${theme}
Seed (for uniqueness): ${seed}
FORBIDDEN answers (do NOT use): [${exclude}]

Rules:
- Difficulty: HARD — needs lateral thinking and clever deduction
- Use layered metaphors and misdirection
- The "clue" must be a helpful alternate hint WITHOUT giving the answer away
- Reply ONLY with valid JSON: {"riddle": "...", "answer": "...", "clue": "..."}`,
        },
    ];

    try {
        let text = await callAI(messages, true);
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const data = JSON.parse(text);
        console.log(`[Riddle] Answer: ${data.answer}`);
        res.json(data);
    } catch (err) {
        console.warn('[Riddle] All AI models failed, using fallback.');
        const excluded = exclude ? exclude.split(',') : [];
        res.json(getRandomFallback(excluded));
    }
});

// ─── Chat / Hints Endpoint ────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const { message, riddle, answer, clue, hintCount } = req.body;
    const currentHintNum = typeof hintCount === 'number' ? hintCount + 1 : 1;

    const messages = [
        {
            role: 'system',
            content: `You are a friendly, helpful AI Guide in a treasure hunt game.
The riddle is: "${riddle}"
The correct answer is: "${answer}"
An alternate clue: "${clue}"

Your job:
- Give a clear, useful hint based on what the player asked
- Do NOT reveal the answer word directly
- Be encouraging and friendly
- Keep it to 2-3 sentences`,
        },
        { role: 'user', content: message },
    ];

    try {
        const reply = await callAI(messages, false);
        res.json({ reply, hintCount: currentHintNum });
    } catch (err) {
        console.warn('[Chat] All AI models failed, using progressive hint.');
        const word = (answer || '').toLowerCase().trim();
        const words = word.split(' ');
        let hint;
        if (currentHintNum === 1) {
            hint = clue ? `💡 Here's a hint: ${clue}` : `💡 Think carefully about the metaphors in the riddle.`;
        } else if (currentHintNum === 2) {
            hint = words.length > 1
                ? `📏 The answer is ${words.length} words with ${words.map(w => w.length).join(' and ')} letters.`
                : `📏 The answer is one word with ${word.length} letters.`;
        } else if (currentHintNum === 3) {
            hint = `🔤 The answer starts with the letter "${word[0]?.toUpperCase()}".`;
        } else {
            const revealed = words.map(w =>
                w.split('').map((ch, i) => (i < w.length - 2 ? ch.toUpperCase() : '_')).join('')
            ).join(' ');
            hint = `🏁 Almost there! The answer looks like: "${revealed}"`;
        }
        res.json({ reply: hint, hintCount: currentHintNum });
    }
});

// ─── Victory Story Endpoint ───────────────────────────────────────────────────
app.get('/api/reward', async (req, res) => {
    const messages = [{
        role: 'user',
        content: 'Write an epic 2-sentence victory message for a player who just solved all riddles in an AI treasure hunt. Describe legendary treasure — glowing gems, rare gold, and a mythical artifact. Make it exciting!',
    }];

    try {
        const story = await callAI(messages, false);
        res.json({ story });
    } catch {
        res.json({ story: 'You found a legendary chest overflowing with shimmering gold, ancient jewels, and a mythical artifact pulsing with arcane power!' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Treasure Hunt running at http://localhost:${PORT}`);
});
