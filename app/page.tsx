'use client';
import 'regenerator-runtime/runtime'; // Necessary for async/await to work in all environments
import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const defaultIntroduction = ``;

export default function Home() {
  // API key for OpenAI's GPT-3
  const API_KEY = process.env.API_KEY

  // Commands for the speech recognition, '*' means any speech will be accepted
  const commands = [
    {
      command: ['*'],
      callback: (command: string) => handleSend(command),
    },
  ]

  const [speakButtonDisabled, setSpeakButtonDisabled] = useState(false);
  const { transcript, resetTranscript, listening, finalTranscript } = useSpeechRecognition({ commands });
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis>();
  const [messages, setMessages] = useState([ // Messages in the chat
    {
      message: defaultIntroduction,
      sender: 'ChatGPT',
    },
  ])

  // On component mount, initialize speech synthesis API
  useEffect(() => {
    setSpeechSynthesis(window.speechSynthesis)
  }, [])

  // Function for making the chatbot speak
  const speak = (message: string) => {
    // If speech synthesis is not supported, return
    if (!speechSynthesis) {
      return
    }

    // If speech recognition is not supported, speak an error message
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      speechSynthesis.speak(
        new SpeechSynthesisUtterance(
          'Your browser does not support speech recognition software! Try Chrome desktop.',
        ),
      )
      return
    }

    speechSynthesis.speak(new SpeechSynthesisUtterance(message))
  }

  // System message that defines the behavior of the chatbot
  const systemMessageToSetChatGptBehaviour = {
    role: 'system',
    content:
      'Your name is Ricky. An incredibly intelligent and quick-thinking AI, that always replies with enthusiastic and positive energy.',
  }

  // Function to handle message sending
  const handleSend = async (message: string) => {
    if (!message) {
      return
    }
    // API is expecting objects in format of { role: "user" or "assistant", "content": "message here"}
    // So we need to reformat
    // Format the message and add it to the existing messages
    const formattedMessage = {
      message,
      direction: 'outgoing',
      sender: 'user',
    };

    const updatedMessages = [...messages, formattedMessage];
    setMessages(updatedMessages);

    // Get a response from the chatbot
    await getChatGptAnswer(updatedMessages)
  }

  // Function to get a response from the chatbot
  async function getChatGptAnswer(messagesWithSender: { message: string; sender: string }[]) {
    // Format messages for the OpenAI API
    const chatGptApiFormattedMessages = messagesWithSender.map((messageObject) => {
      return {
        role: messageObject.sender === 'ChatGPT' ? 'assistant' : 'user',
        content: messageObject.message,
      }
    });

    // Set up the request body for the OpenAI API
    const chatGptApiRequestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        systemMessageToSetChatGptBehaviour, // The system message defines the chatbot's behavior
        ...chatGptApiFormattedMessages, // The messages from the chat with the chatbot
      ],
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + `${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatGptApiRequestBody),
    })

    // Get the chatbot's response and add it to the messages
    const { choices } = await response.json()
    setMessages([
      ...messagesWithSender,
      {
        message: choices[0].message.content,
        sender: 'ChatGPT',
      },
    ])
    speak(choices[0].message.content)
  }

  // Function to start speech recognition
  const ask = () => {
    setSpeakButtonDisabled(true) // Disable the speak button while recording

    // If speech recognition is not supported, add an error message
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      setMessages([
        ...messages,
        {
          message: 'Your browser does not support speech recognition software! Try Chrome desktop, maybe?',
          sender: 'ChatGPT',
        },
      ])
      return;
    }

    // Start speech recognition
    SpeechRecognition.startListening()

    // Reset the transcript if it's not empty
    if (transcript !== '') {
      resetTranscript()
    }

    setSpeakButtonDisabled(false) // Re-enable the speak button after recording
  }

  return (
    <main className='bg-[#45badd]'>
      <div className='h-screen w-screen lg:flex lg:flex-row lg:items-center lg:justify-center flex-col items-center justify-end lg:p-24 p-10 pt-0'>
        <div className='lg:h-[600px] lg:w-[600px] md:h-[calc(100%-200px)] sm:h-[calc(100%-300px)] w-full bg-no-repeat bg-contain bg-center'></div>
        <div className='flex justify-center flex-col items-center lg:w-[calc(100%-600px)]'>
          <div className='text-xl text-[#433136] font-bold pb-4'>
            quote left icon
            {messages[messages.length - 1].message}
          </div>
          <button
            className='cursor-pointer outline-none w-[80px] h-[50px] md:text-lg text-white bg-[#ff3482] border-none border-r-5 shadow'
            onClick={ask}
            disabled={speakButtonDisabled}
          >
            microphone icon
          </button>
        </div>
      </div>
    </main>
  )
}