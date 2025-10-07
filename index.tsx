/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import './index.css';

const e = React.createElement;

const App = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  return e(
    'div',
    { className: 'app-container' },
    e(
      'header',
      null,
      e('h1', null, 'TMEP Expert Assistant'),
      e('p', null, 'Your guide to the Trademark Manual of Examining Procedure')
    ),
    e(
      'main',
      null,
      e(
        'form',
        { onSubmit: handleSubmit, 'aria-labelledby': 'form-heading' },
        e('label', { htmlFor: 'query-input', id: 'form-heading', className: 'sr-only' }, 'Ask a question about the TMEP'),
        e('input', {
          id: 'query-input',
          type: 'text',
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: 'e.g., What constitutes a merely descriptive mark?',
          disabled: loading,
          'aria-required': 'true',
        }),
        e('button', { type: 'submit', disabled: loading }, loading ? 'Thinking...' : 'Ask')
      ),
      error && e('p', { className: 'error', role: 'alert' }, error),
      e(
        'div',
        { className: 'response-container' },
        loading &&
          e(
            'div',
            { className: 'loader', 'aria-label': 'Loading response' },
            e('div', { className: 'square' }),
            e('div', { className: 'square' }),
            e('div', { className: 'square' })
          ),
        response &&
          e(
            'div',
            { className: 'response-content' },
            e('h2', null, 'Response'),
            e('div', { dangerouslySetInnerHTML: { __html: response } })
          ),
        sources.length > 0 &&
          e(
            'div',
            { className: 'sources-content' },
            e('h3', null, 'Sources'),
            e(
              'ul',
              null,
              sources.map((source, index) =>
                source.web &&
                e(
                  'li',
                  { key: index },
                  e(
                    'a',
                    { href: source.web.uri, target: '_blank', rel: 'noopener noreferrer' },
                    source.web.title || source.web.uri
                  )
                )
              )
            )
          )
      )
    )
  );
};

const root = createRoot(document.getElementById('root'));
root.render(e(React.StrictMode, null, e(App, null)));