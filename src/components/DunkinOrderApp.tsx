import React, { useState, useMemo } from "react";
import { useChatContext } from "../context/ChatContext";
import { ChatService } from "../services/chatService";
import { Header } from "./Header";
import { Filters } from "./Filters";
import { ChatPanel } from "./ChatPanel";
import { SlidePanel } from "./SlidePanel";
import { CartSummary } from "./CartSummary";
import { QueryType } from "../context/ChatContext";
import { menuItems } from "../data/menuData";
import { ImageService } from "../services/imageService";
import { SpeechService, SpeechRecognitionResult } from '../services/speechService';
import axios from "axios";
const chatService = new ChatService();

interface ApiResponse {
  text: string;
  items: { id: number; name: string; price: string }[];
}

export const DunkinOrderApp: React.FC = () => {
  const { state, dispatch } = useChatContext();
  const [input, setInput] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(true);
  const [peopleCount, setPeopleCount] = useState(1);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isImageAnalyzing, setIsImageAnalyzing] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const speechService = useMemo(() => new SpeechService(), []);
  const isSpeechSupported = useMemo(() => speechService.isSupported(), [speechService]);

  // Replace with your DeepSeek API endpoint and API key
  const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"; // Example endpoint
  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"; // Example endpoint
  const API_KEY = import.meta.env.VITE_PUBLIC_DEEPSEEK_KEY; // Replace with your actual API key
  const OPENAI_KEY = import.meta.env.VITE_PUBLIC_OPENAI_API_KEY; // Replace with your actual API key

  const imageService = new ImageService();

  const handleImageUpload = async (file: File) => {
    setIsImageAnalyzing(true);
    // Create local image URL and dispatch user message
    const imageUrl = URL.createObjectURL(file);
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        id: Date.now(),
        text: "",
        isBot: false,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        imageUrl,
        queryType: QueryType.MENU_QUERY,
      },
    });

    try {
      // Analyze image using OpenAI
      const imageDescription = await imageService.analyzeImage(file);

      const prompt = `Here is the menu data: ${JSON.stringify(
        menuItems
      )}. Based on this image description: "${imageDescription}". Return the response in the format { "text": "", "items": [{ id: number, name: string, price: string }],"conclusion":"" }, where "text" is a creative/cleaver/funny information - in around 25 words and "items" is an array of matching menu items with only id, name, and price and "conclusion" is final short creative remark.. Include a maximum of 6 items and minimum 2 items - but be flexible with items count based on requirements. Do not include any additional text or explanations or format.`;

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
        }
      );

      // Dispatch bot response
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now() + 1,
          text: response.data.choices[0].message.content,
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType: QueryType.MENU_QUERY,
        },
      });
    } catch (error) {
      console.error("Image analysis error:", error);
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now() + 1,
          text: "Sorry, I couldn't analyze the image.",
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType: QueryType.GENERAL,
        },
      });
    } finally {
      setIsImageAnalyzing(false);
    }
  };

  const handleSpeechRecognition = async (result: SpeechRecognitionResult) => {
    if (!result.isFinal) {
      setInterimTranscript(result.transcript);
      return;
    }
  
    try {
      speechService.stopListening();
      setIsSpeechEnabled(false);
      setInterimTranscript('');
      
      const transcript = result.transcript.trim();
      if (!transcript) return;
  
      const queryType = chatService.determineQueryType(transcript);
  
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now(),
          text: transcript,
          isBot: false,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType,
        },
      });
  
      dispatch({ type: "SET_LOADING", payload: true });
  
      // Simpler prompt to reduce token count
      const prompt = `Here is the menu data: ${JSON.stringify(
        menuItems
      )}. Based on this, answer the user's query: ${transcript}. Return the response in the format strictly - { "text": "", "items": [{ "id": number, "name": string, "price": string }],"conclusion":"" }, where "text" is a creative/cleaver/funny information related to user query - in around 25 words and "items" is an array of matching menu items with only id, name, and price and "conclusion" is final short creative remark. Include a maximum of 6 items and minimum 2 items - but be flexible with items count based on requirements,if you find this is a greeting message from the user, like hey, how are you , hi etc or anything that is out of the menu reply accordingly and set "items" to [],also ignore menu items in that case and "conclusion" shoudl be "". Do not include any additional text or explanations or format type in response.`;
      
  
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
        }
      );
  
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now() + 1,
          text: response.data.choices[0].message.content,
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType,
        },
      });
  
    } catch (error) {
      console.error('Error:', error);
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now() + 1,
          text: "Please try that again.",
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType: QueryType.GENERAL,
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };
  
  // Function to toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (!isSpeechSupported) return;
    
    if (isSpeechEnabled) {
      speechService.stopListening();
      setIsSpeechEnabled(false);
      setInterimTranscript('');
    } else {
      setIsSpeechEnabled(true);
      speechService.startListening(
        handleSpeechRecognition,
        (error) => {
          console.error(error);
          setIsSpeechEnabled(false);
          setInterimTranscript('');
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now(),
              text: "Sorry, there was an error with speech recognition. Please try again.",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.GENERAL,
            },
          });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log(input);
    console.log(e.target);
    e.preventDefault();
    if (!input.trim()) return;

    // Switch to chat mode if currently in browse mode when starting checkout
    if (state.checkout.step && state.mode === "browse") {
      dispatch({ type: "SET_MODE", payload: "chat" });
    }

    // Handle checkout flow
    if (state.checkout.step) {
      const userMessage = {
        id: Date.now(),
        text: input.trim(),
        isBot: false,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }),
        queryType: QueryType.CHECKOUT,
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });

      if (state.checkout.step === "details") {
        if (!state.checkout.orderDetails.name) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { name: input.trim() },
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: "Great! What's your delivery address?",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
        } else if (!state.checkout.orderDetails.address) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { address: input.trim() },
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: "Perfect! And your phone number?",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
        } else if (!state.checkout.orderDetails.phone) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { phone: input.trim() },
          });
          dispatch({ type: "SET_CHECKOUT_STEP", payload: "payment" });
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: "Great! Now for payment. Please enter your card number:",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
        }
      } else if (state.checkout.step === "payment") {
        if (!state.checkout.orderDetails.cardNumber) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { cardNumber: input.trim() },
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: "Please enter the card expiry date (MM/YY):",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
        } else if (!state.checkout.orderDetails.expiryDate) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { expiryDate: input.trim() },
          });
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: "Finally, please enter the CVV:",
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
        } else if (!state.checkout.orderDetails.cvv) {
          dispatch({
            type: "UPDATE_ORDER_DETAILS",
            payload: { cvv: input.trim() },
          });
          // Process the order
          const total = state.cart
            .reduce(
              (sum, item) => sum + parseFloat(item.price) * item.quantity,
              0
            )
            .toFixed(2);

          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              id: Date.now() + 1,
              text: `Thank you for your order! Your total is $${total}. Your order will be delivered to ${state.checkout.orderDetails.address}. We'll send updates to ${state.checkout.orderDetails.phone}.`,
              isBot: true,
              time: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "numeric",
                hour12: true,
              }),
              queryType: QueryType.CHECKOUT,
            },
          });
          // Reset checkout and cart
          dispatch({ type: "SET_CHECKOUT_STEP", payload: null });
        }
      }
      setInput("");
      return;
    }

    // Determine query type
    const queryType = chatService.determineQueryType(input.trim());

    // Create user message with query type
    const userMessage = {
      id: Date.now(),
      text: input.trim(),
      isBot: false,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }),
      queryType, // Include query type in message
    };

    // Update state
    dispatch({ type: "ADD_MESSAGE", payload: userMessage });
    dispatch({ type: "SET_QUERY_TYPE", payload: queryType });
    setInput("");
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      try {
        const prompt = `Here is the menu data: ${JSON.stringify(
          menuItems
        )}. Based on this, answer the user's query: ${input}. Return the response in the format strictly - { "text": "", "items": [{ "id": number, "name": string, "price": string }],"conclusion":"" }, where "text" is a creative/cleaver/funny information related to user query - in around 25 words and "items" is an array of matching menu items with only id, name, and price and "conclusion" is final short creative remark. Include a maximum of 6 items and minimum 2 items - but be flexible with items count based on requirements. Do not include any additional text or explanations or format type in response.`;
        // Call the DeepSeek API with the correct request format
        const response = await axios.post(
          OPENAI_API_URL,
          {
            model: "gpt-4o", // Specify the model you're using
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 500, // Adjust based on your needs
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_KEY}`,
            },
          }
        );

        // Parse the API response
        const apiResponseText = response.data.choices[0].message.content;
        console.log(apiResponseText);
        // const apiResponse = JSON.parse(apiResponseText) as ApiResponse;
        // setResponse(apiResponse);

        // Create bot message
        const botMessage = {
          id: Date.now() + 1,
          text: apiResponseText,
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType, // Keep the same query type for the response
        };

        // Add bot message to chat
        dispatch({ type: "ADD_MESSAGE", payload: botMessage });
      } catch (error) {
        console.error("Error calling DeepSeek API:", error);
      } finally {
        // setIsLoading(false);
      }
    } catch (error) {
      console.error("Error querying menu:", error);

      // Add error message
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: Date.now() + 1,
          text: "Sorry, I had trouble understanding your question. Please try again.",
          isBot: true,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }),
          queryType: QueryType.GENERAL,
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Helper function to get appropriate placeholder text based on current query type
  const getInputPlaceholder = () => {
    switch (state.currentQueryType) {
      case QueryType.MENU_QUERY:
        return "Ask about menu items, prices, or place an order...";
      default:
        return "Type your message here...";
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#f2abb1] sm:py-[5vh]">
      <div className="relative bg-white/70 backdrop-blur-md rounded-none sm:rounded-2xl shadow-xl w-full h-screen sm:h-[90vh] max-w-md overflow-hidden border border-white/20 flex flex-col sm:mx-4">
        <Header
          onOpenPanel={() => setIsPanelOpen(true)}
          onCartClick={() => setIsCartOpen(!isCartOpen)}
          // queryType={state.currentQueryType}
        />

        <Filters
          isVegOnly={isVegOnly}
          setIsVegOnly={setIsVegOnly}
          peopleCount={peopleCount}
          setPeopleCount={setPeopleCount}
        />

        <ChatPanel
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          placeholder={getInputPlaceholder()}
          onImageUpload={handleImageUpload}
          isImageAnalyzing={isImageAnalyzing}
          isLoading={state.isLoading}
          queryType={state.currentQueryType}
          isSpeechEnabled={isSpeechEnabled}
          isSpeechSupported={isSpeechSupported}
          onSpeechToggle={toggleSpeechRecognition}
          interimTranscript={interimTranscript}
        />
        <CartSummary />
      </div>

      <SlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        savedAddresses={[]}
        onDeleteAddress={() => {}}
      />

      {/* Cart Summary */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-4 bg-red-50 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Your Cart</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
              {state.cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      ${item.price} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_CART_ITEM",
                          payload: {
                            ...item,
                            quantity: Math.max(0, item.quantity - 1),
                          },
                        })
                      }
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_CART_ITEM",
                          payload: { ...item, quantity: item.quantity + 1 },
                        })
                      }
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {state.cart.length > 0 ? (
              <div className="p-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-red-500">
                    $
                    {state.cart
                      .reduce(
                        (total, item) =>
                          total + parseFloat(item.price) * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    dispatch({ type: "SET_CHECKOUT_STEP", payload: "details" });
                  }}
                  className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Your cart is empty
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
