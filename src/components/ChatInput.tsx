// src/components/ChatInput.tsx
import React from "react";
import {
  Send,
  ImageIcon,
  Coffee,
  Pizza,
  Clock,
  Siren as Fire,
  Vegan,
  Group,
  Mic,
  MicOff,
} from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (file: File) => void;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
  showQuickActions?: boolean;
  isSpeechEnabled?: boolean;
  isSpeechSupported?: boolean;
  onSpeechToggle?: () => void;
  interimTranscript?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  onImageUpload,
  isLoading = false,
  className = "",
  placeholder = "Type a message...",
  showQuickActions = true,
  isSpeechEnabled = false,
  isSpeechSupported = false,
  onSpeechToggle = () => {},
  interimTranscript = "",
}) => {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImageUpload(file);
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    const event = new Event("submit") as unknown as React.FormEvent;
    onSubmit(event);
  };

  return (
    <div className={`p-4 border-t border-white/20 bg-white/50 backdrop-blur-sm ${className}`}>
      {/* Display interim transcript during speech recognition */}
      {isSpeechEnabled && interimTranscript && (
        <div className="mb-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 italic">
          {interimTranscript}
        </div>
      )}
      <div>
        {showQuickActions && !input && (
          <div className="grid grid-cols-2 gap-1 mb-2 h-[80px]">
            <button
              onClick={() =>
                handleQuickAction("Suggest Lunch combo for AED 50 or less?")
              }
              className="flex items-center gap-2 p-2 bg-white/80 rounded-xl hover:bg-white/90 transition-colors text-xs text-gray-700 border border-gray-100"
            >
              <Fire className="w-4 h-4 text-red-600" />
              <span className="text-left">
                <span className="font-medium block">Lunch combo</span>
              </span>
            </button>

            <button
              onClick={() => handleQuickAction("Suggest me veg options?")}
              className="flex items-center gap-2 p-2 bg-white/80 rounded-xl hover:bg-white/90 transition-colors text-xs text-gray-700 border border-gray-100"
            >
              <Vegan className="w-4 h-4 text-red-600" />
              <span className="text-left">
                <span className="font-medium block">Veg options</span>
              </span>
            </button>

            <button
              onClick={() => handleQuickAction("Suggest me Best combo options")}
              className="flex items-center gap-2 p-2 bg-white/80 rounded-xl hover:bg-white/90 transition-colors text-xs text-gray-700 border border-gray-100"
            >
              <Group className="w-4 h-4 text-red-600" />
              <span className="text-left">
                <span className="font-medium block">Best KFC combos</span>
              </span>
            </button>

            <button
              onClick={() =>
                handleQuickAction("Suggest me Chicken burger meal")
              }
              className="flex items-center gap-2 p-2 bg-white/80 rounded-xl hover:bg-white/90 transition-colors text-xs text-gray-700 border border-gray-100"
            >
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-left">
                <span className="font-medium block">Chicken burger meal</span>
              </span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          placeholder={isSpeechEnabled ? "Listening..." : placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-red-600 
                     backdrop-blur-sm placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Microphone button with better accessibility */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={onSpeechToggle}
            aria-label={isSpeechEnabled ? "Stop voice input" : "Start voice input"}
            aria-pressed={isSpeechEnabled}
            className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${isSpeechEnabled 
                ? 'bg-black hover:bg-gray-800 text-white' 
                : 'bg-[#cc1c1c] hover:bg-red-600 text-white'}`}
          >
            {isSpeechEnabled ? (
              <MicOff className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Mic className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        )}
        
        <label className="cursor-pointer p-2 bg-[#cc1c1c] hover:bg-red-600 rounded-full text-white transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <ImageIcon className="w-5 h-5" />
        </label>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 bg-[#cc1c1c] hover:bg-red-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
