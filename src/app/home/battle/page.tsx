"use client";
import React, { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// --- СТИЛІ (без змін) ---
const styles = {
    container: {
        display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)',
        width: '100%', maxWidth: '800px', margin: '60px auto 0', padding: '20px',
        boxSizing: 'border-box' as const, fontFamily: "'Inter', sans-serif", color: '#e0e7ff',
    },
    storyWindow: {
        flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.8)', borderRadius: '12px',
        padding: '20px', overflowY: 'auto' as 'auto', border: '1px solid rgba(79, 70, 229, 0.5)',
        boxShadow: '0 0 20px rgba(79, 70, 229, 0.2)', marginBottom: '20px',
        fontSize: '1.1rem', lineHeight: 1.7,
    },
    actionsContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', },
    actionButton: {
        background: 'linear-gradient(145deg, #4f46e5, #6366f1)', color: 'white', border: 'none',
        borderRadius: '8px', padding: '16px 20px', fontSize: '1rem', fontWeight: '600',
        cursor: 'pointer', transition: 'all 0.2s ease-in-out', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    },
    loadingOverlay: {
        position: 'absolute' as 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10, 20, 40, 0.7)', backdropFilter: 'blur(5px)', display: 'flex',
        justifyContent: 'center', alignItems: 'center', zIndex: 100, fontSize: '1.5rem', color: '#fff',
    }
};

interface AIResponse {
    story: string;
    choices: string[];
}

// --- ГОЛОВНИЙ КОМПОНЕНТ ---
export default function TextAdventurePage() {
    const [story, setStory] = useState<string>("Ти стоїш на роздоріжжі в Темному лісі. Повітря густе і пахне вологою землею. Стежка веде на **північ**, у гущавину, і на **схід**, до старого, похмурого болота.");
    const [choices, setChoices] = useState<string[]>(["Йти на північ", "Йти на схід", "Оглянутись навколо"]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const [chatHistory, setChatHistory] = useState([
        { role: "user", parts: [{ text: "Act as a dark fantasy RPG dungeon master. You will describe a scene and provide exactly 3 choices in a JSON object format like {\"story\": \"...\", \"choices\": [\"...\", \"...\", \"...\"]}. Never break character. Your answer must be only the JSON object, without any additional text or markdown formatting. The first scene is: A crossroad in a dark forest."}] },
        { role: "model", parts: [{ text: JSON.stringify({ story: "Ти стоїш на роздоріжжі в Темному лісі. Повітря густе і пахне вологою землею. Стежка веде на **північ**, у гущавину, і на **схід**, до старого, похмурого болота.", choices: ["Йти на північ", "Йти на схід", "Оглянутись навколо"] }) }] }
    ]);

    const handleChoice = useCallback(async (choice: string) => {
        setIsLoading(true);

        const newHistory = [...chatHistory, { role: "user", parts: [{ text: `My choice is: "${choice}"` }] }];
        setChatHistory(newHistory);

        const payload = { contents: newHistory };
        const apiKey = "AIzaSyCdfukZL62hI3FBXgHZ-0Aj7iAlZOdWDzc"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // --- ДІАГНОСТИКА: Перевіряємо статус відповіді ---
            if (!response.ok) {
                console.error("Помилка API:", response.status, response.statusText);
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const rawText = result.candidates[0].content.parts[0].text;
                
                // --- ДІАГНОСТИКА: Дивимось на "сиру" відповідь від AI ---
                console.log("Сира відповідь від AI:", rawText);

                // --- ЗМІНА: Більш надійний парсинг JSON ---
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("AI did not return a valid JSON object.");
                }
                const cleanJsonText = jsonMatch[0];

                const parsedResponse: AIResponse = JSON.parse(cleanJsonText);
                
                setStory(parsedResponse.story);
                setChoices(parsedResponse.choices);
                
                setChatHistory(prev => [...prev, { role: "model", parts: [{ text: cleanJsonText }] }]);
            } else {
                // --- ДІАГНОСТИКА: Дивимось на структуру відповіді, якщо вона неправильна ---
                console.error("Неправильна структура відповіді:", result);
                throw new Error("Invalid response structure from AI.");
            }
        } catch (error) {
            console.error("Помилка при взаємодії з AI:", error);
            setStory("Темрява згущується, і ти відчуваєш, що щось пішло не так... Спробуй зробити інший вибір. (Помилка: " + (error as Error).message + ")");
        } finally {
            setIsLoading(false);
        }
    }, [chatHistory]);

    return (
        <div style={styles.container as React.CSSProperties}>
            {isLoading && (
                <div style={styles.loadingOverlay}>
                    <span>Доля вирішується...</span>
                </div>
            )}
            <div style={styles.storyWindow}>
                <ReactMarkdown>{story}</ReactMarkdown>
            </div>
            <div style={styles.actionsContainer}>
                {choices.map((choice, index) => (
                    <button 
                        key={index} 
                        style={styles.actionButton} 
                        onClick={() => handleChoice(choice)}
                        disabled={isLoading}
                    >
                        {choice}
                    </button>
                ))}
            </div>
        </div>
    );
}

