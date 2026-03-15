import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const EXAMPLE_PROMPTS = [
  { emoji: "🛍️", title: "E-commerce store", prompt: "Build a modern e-commerce landing page with a hero section, featured products grid, and a shopping cart sidebar" },
  { emoji: "📊", title: "Dashboard", prompt: "Create an analytics dashboard with charts, stats cards, and a sidebar navigation" },
  { emoji: "📝", title: "Blog platform", prompt: "Build a clean blog with a post list, individual post view, and a dark mode toggle" },
  { emoji: "🎨", title: "Portfolio site", prompt: "Create a minimal portfolio website with project cards, about section, and contact form" },
];

const NewScreen: React.FC = () => {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleStartBuilding = (prompt?: string) => {
    const text = prompt || input;
    if (text.trim()) {
      const sessionId = generateUUID();
      navigate(`/create?session_id=${sessionId}`, {
        state: { initialPrompt: text, session_id: sessionId },
      });
    }
  };

  return (
    <Outer>
      <CenterColumn>
        <LogoTitleGroup>
          <Logo>⚡</Logo>
          <h1 className="text-3xl md:text-4xl font-bold text-white">What do you want to build?</h1>
          <p className="text-base md:text-lg font-normal text-gray-400">
            Build websites instantly with Holly Code.
          </p>
        </LogoTitleGroup>
        <PromptCard>
          <TextareaWrapper>
            <StyledTextarea
              rows={3}
              placeholder="Describe what you want to build..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleStartBuilding();
                }
              }}
            />
            <RunButton>
              <Button
                onClick={() => handleStartBuilding()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Start Building
              </Button>
            </RunButton>
          </TextareaWrapper>
        </PromptCard>
        <ExamplesGrid>
          {EXAMPLE_PROMPTS.map((ex) => (
            <ExampleCard key={ex.title} onClick={() => handleStartBuilding(ex.prompt)}>
              <span style={{ fontSize: 24 }}>{ex.emoji}</span>
              <ExampleTitle>{ex.title}</ExampleTitle>
              <ExampleDesc>{ex.prompt.slice(0, 60)}...</ExampleDesc>
            </ExampleCard>
          ))}
        </ExamplesGrid>
      </CenterColumn>
    </Outer>
  );
};

export default NewScreen;

const Outer = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0e0e10;
  padding: 24px 16px;
  box-sizing: border-box;
`;

const CenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 700px;
  gap: 32px;
`;

const LogoTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`;

const Logo = styled.div`
  font-size: 48px;
  margin-bottom: 8px;
`;

const PromptCard = styled.div`
  width: 100%;
  border-radius: 16px;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  padding: 4px;
`;

const TextareaWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledTextarea = styled(Textarea)`
  background: transparent !important;
  border: none !important;
  color: white !important;
  resize: none;
  font-size: 16px;
  padding: 16px;
  padding-bottom: 56px;
  min-height: 100px;
  &::placeholder {
    color: #6b7280;
  }
  &:focus {
    outline: none !important;
    box-shadow: none !important;
  }
`;

const RunButton = styled.div`
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
`;

const ExamplesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ExampleCard = styled.div`
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:hover {
    border-color: #6366f1;
    background: #1e1e3a;
  }
`;

const ExampleTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
`;

const ExampleDesc = styled.div`
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
`;
