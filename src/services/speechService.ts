// src/services/speechService.ts

export interface SpeechRecognitionResult {
    transcript: string;
    isFinal: boolean;
  }
  
  type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;
  type ErrorCallback = (error: string) => void;
  
  export class SpeechService {
    private recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
    private interimTranscriptBuffer: string = '';
  
    constructor() {
      console.log("SpeechService constructor called");
      this.initializeSpeechRecognition();
    }
  
    private initializeSpeechRecognition(): void {
      console.log("Initializing speech recognition");
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
      if (!SpeechRecognition) {
        console.error("Speech recognition is not supported in this browser.");
        alert("Speech recognition is not supported in this browser. Please use a supported browser like Chrome.");
        return;
      }
  
      try {
        this.recognition = new SpeechRecognition();
        // Set continuous to false to get one complete utterance
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";
        console.log("Speech recognition initialized successfully");
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
      }
    }
  
    public startListening(
      onResult: SpeechRecognitionCallback,
      onError: ErrorCallback
    ): void {
      console.log("startListening called");
  
      if (!this.recognition) {
        console.error("Recognition not initialized");
        onError("Speech recognition is not supported in this browser");
        return;
      }
  
      if (this.isListening) {
        console.log("Already listening, ignoring duplicate start call");
        return;
      }
  
      this.isListening = true;
      this.interimTranscriptBuffer = '';
      console.log("Setting up recognition handlers");
  
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
  
        if (lastResult.isFinal) {
          // Send final result with complete transcript
          console.log("Final result:", transcript);
          onResult({
            transcript: transcript.trim(),
            isFinal: true,
          });
          
          // Automatically stop listening after final result
          this.stopListening();
        } else {
          // Send interim result for UI updates
          console.log("Interim result:", transcript);
          onResult({
            transcript: transcript.trim(),
            isFinal: false,
          });
        }
      };
  
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        this.isListening = false;
        
        let errorMessage = "";
        switch (event.error) {
          case "network":
            errorMessage = "Network error occurred. Please check your connection.";
            break;
          case "not-allowed":
          case "service-not-allowed":
            errorMessage = "Microphone access is blocked. Please allow it.";
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        onError(errorMessage);
      };
  
      this.recognition.onend = () => {
        console.log("Recognition ended");
        // Only reset isListening if we haven't already stopped
        if (this.isListening) {
          this.isListening = false;
          // Restart recognition for continuous listening if needed
          this.startListening(onResult, onError);
        }
      };
  
      try {
        console.log("Starting recognition");
        this.recognition.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        this.isListening = false;
        onError("Failed to start speech recognition");
      }
    }
  
    public stopListening(): void {
      console.log("stopListening called");
      if (!this.recognition || !this.isListening) {
        console.log("Not listening or recognition not available");
        return;
      }
  
      try {
        this.isListening = false; // Set this first to prevent auto-restart
        this.recognition.stop();
        console.log("Recognition stopped successfully");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  }