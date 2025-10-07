/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import './index.css';

const App = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const modelResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction: 'You are an expert assistant for the Trademark Manual of Examining Procedure (TMEP). Your responses must be based on the latest published version of the TMEP. When you reference a section of the TMEP, you must embed a hyperlink to that section using markdown format (e.g., [TMEP §1202.01](https://tmep.uspto.gov/...)). Limit your responses to questions concerning information found within the TMEP.',
          tools: [{ googleSearch: {} }],
        },
      });
      
      const text = modelResponse.text;
      const parsedHtml = await marked.parse(text);
      setResponse(parsedHtml);

      const groundingChunks = modelResponse.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      setSources(groundingChunks);

    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching the response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>TMEP Expert Assistant</h1>
        <p>Your guide to the Trademark Manual of Examining Procedure</p>
      </header>
      <main>
        <form onSubmit={handleSubmit} aria-labelledby="form-heading">
          <label htmlFor="query-input" id="form-heading" className="sr-only">Ask a question about the TMEP</label>
          <input
            id="query-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., What constitutes a merely descriptive mark?"
            disabled={loading}
            aria-required="true"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="response-container">
          {loading && (
            <div className="loader" aria-label="Loading response">
              <div className="square"></div>
              <div className="square"></div>
              <div className="square"></div>
            </div>
          )}
          {response && (
             <div className="response-content">
                <h2>Response</h2>
                <div dangerouslySetInnerHTML={{ __html: response }} />
            </div>
          )}
          {sources.length > 0 && (
            <div className="sources-content">
                <h3>Sources</h3>
                <ul>
                    {sources.map((source, index) => (
                        source.web && (
                            <li key={index}>
                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer">
                                    {source.web.title || source.web.uri}
                                </a>
                            </li>
                        )
                    ))}
                </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);