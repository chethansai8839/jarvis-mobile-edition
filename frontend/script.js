
// ==========================================
// 1. GEMINI API KEY
// ==========================================

// Prototype only: key stays in memory, not browser storage.
// For deployment, move API requests to a backend.

const API_KEY = (prompt("Enter your Gemini API Key:") || "").trim();

// ==========================================
// 2. GEMINI MODELS (AUTO FALLBACK)
// ==========================================

const MODELS = [
    "gemini-3.8-flash",
    "gemini-flash-latest"
];

// ==========================================
// 3. HTML ELEMENTS
// ==========================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

if (!chat || !input || !sendBtn) {
    throw new Error("JARVIS HTML elements are missing.");
}

// Create microphone button if it is not in HTML
let micBtn = document.getElementById("mic-btn");

if (!micBtn) {
    micBtn = document.createElement("button");
    micBtn.id = "mic-btn";
    micBtn.type = "button";
    micBtn.innerText = "MIC";
    document.querySelector(".input-area").appendChild(micBtn);
}

// ==========================================
// 4. CHAT MESSAGE FUNCTION
// ==========================================

function add(text, who) {

    const d = document.createElement("div");

    d.className = "msg " + who;
    d.innerText = text;

    chat.appendChild(d);

    chat.scrollTop = chat.scrollHeight;

    return d;
}

// ==========================================
// 5. GEMINI AI BRAIN
// ==========================================

async function callGemini(promptText) {

    if (!API_KEY) {
        throw new Error("API key is missing. Reload and enter your key.");
    }

    let lastError;

    for (let i = 0; i < MODELS.length; i++) {

        const model = MODELS[i];

        try {

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": API_KEY
                    },

                    body: JSON.stringify({

                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: promptText
                                    }
                                ]
                            }
                        ]

                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {

                const message =
                    data.error?.message || "Gemini API request failed";

                const modelUnavailable =
                    res.status === 404 ||
                    (res.status === 400 &&
                    /model.*(not found|not supported|does not exist)/i.test(message));

                if (modelUnavailable && i < MODELS.length - 1) {
                    lastError = new Error(message);
                    continue;
                }

                throw new Error(message);
            }

            const reply = data.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

            if (!reply) {
                throw new Error(
                    data.promptFeedback?.blockReason ||
                    "Gemini returned no text response."
                );
            }

            return reply;

        } catch (error) {

            lastError = error;

            // Try another model only when the model is unavailable.
            if (i < MODELS.length - 1 &&
                /model.*(not found|not supported|does not exist)/i.test(error.message)) {
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

// ==========================================
// 6. JARVIS RESPONSE SYSTEM
// ==========================================

async function askGemini(promptText) {

    const thinking = add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    sendBtn.disabled = true;

    try {

        const reply = await callGemini(promptText);

        thinking.innerText = "J.A.R.V.I.S: " + reply;

        speak(reply);

    } catch (error) {

        thinking.innerText =
            "J.A.R.V.I.S: ERROR - " + error.message;

        console.error("JARVIS ERROR:", error);

    } finally {

        sendBtn.disabled = false;
        chat.scrollTop = chat.scrollHeight;

    }
}

// ==========================================
// 7. SPEECH RECOGNITION
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let rec = null;

if (SpeechRecognition) {

    rec = new SpeechRecognition();

    rec.lang = "en-US"; // Change to te-IN for Telugu
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
        micBtn.innerText = "LISTENING...";
        micBtn.disabled = true;
    };

    rec.onresult = (event) => {

        const text =
            event.results[0][0].transcript.trim();

        if (text) {

            add("YOU: " + text, "user");

            askGemini(text);
        }
    };

    rec.onerror = (event) => {

        add(
            "J.A.R.V.I.S: Voice error - " + event.error,
            "ai"
        );

    };

    rec.onend = () => {

        micBtn.innerText = "MIC";
        micBtn.disabled = false;

    };

    micBtn.onclick = () => {

        try {
            rec.start();
        } catch (error) {
            console.error("Microphone error:", error);
        }

    };

} else {

    micBtn.disabled = true;
    micBtn.innerText = "VOICE UNSUPPORTED";

}

// ==========================================
// 8. TEXT TO SPEECH
// ==========================================

let voices = [];

function loadVoices() {

    voices = window.speechSynthesis
        ? speechSynthesis.getVoices()
        : [];

}

if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;

}

function speak(text) {

    if (!("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    const voice = voices.find(v =>
        v.lang.toLowerCase().startsWith("en")
    );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);

}

// ==========================================
// 9. TEXT SEND BUTTON
// ==========================================

function sendMessage() {

    const text = input.value.trim();

    if (!text || sendBtn.disabled) return;

    add("YOU: " + text, "user");

    input.value = "";

    askGemini(text);

}

sendBtn.onclick = sendMessage;

// Press ENTER to send
input.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        sendMessage();
    }

});

// ==========================================
// 10. JARVIS INITIALIZATION
// ==========================================

add(
    "J.A.R.V.I.S: Systems initialized. How may I assist you, Boss?",
    "ai"
);
