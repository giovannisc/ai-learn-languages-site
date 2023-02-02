'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './page.module.scss';
import Visualizer from "../libs/Visualizer";
const getUserMedia = require('get-user-media-promise');
import * as TranscribeClient from "../libs/transcribeClient.js";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { getSynthesizeSpeechUrl } from "@aws-sdk/polly-request-presigner";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: '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'
});

const openai = new OpenAIApi(configuration);

function playSound(url: any) {
  var ourAudio = document.createElement('audio'); // Create a audio element using the DOM
  ourAudio.style.display = "none"; // Hide the audio element
  ourAudio.src = url; // Set resource to our URL
  ourAudio.autoplay = true; // Automatically play sound
  document.body.appendChild(ourAudio);
}

async function sayThis(sentence: string, language: string){
  const pollyClient = new PollyClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: "AKIAR7AP5FBSYMY4RXNQ",
      secretAccessKey: "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"
    }
  });
  let params = {
    OutputFormat: "mp3",
    Text: sentence,
    TextType: "text",
    VoiceId: {
      'en-US': "Joanna",
      'pt-BR': "Camila",
      'ru-RU': "Tatyana",
    }[language],
    SampleRate: "22050",
  };
  let url = await getSynthesizeSpeechUrl({
    client: pollyClient, params
  });
  playSound(url)
  return;
}

export default function Home() {
  const [chosenLanguage, setChosenLanguage] = useState("empty");
  const mainRef: any = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const micStream = Visualizer.getMicStream();
  useEffect(() => {
    window.scrollTo({
      top: 1000,
      behavior: 'smooth',
    });
  },[chosenLanguage, mainRef.current])
  const visualizerRef = useRef(null)
  const visualizer = visualizerRef.current
  const canvas: any = visualizer
  const canvasCtx = canvas?.getContext('2d')
  const visualize = () => {
    Visualizer.visualizeSineWave(canvasCtx, canvas, 400, 100, '#ffbc18', 'black')
  }
  const [name, setName] = useState("");
  const currSentence = useRef("");
  const learnSentence = useRef("");
  const [setencesToLearn, setSetencesToLearn] = useState("")
  const findNameWithChatGPT = useCallback(async (sentence: string) => {
    try {
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: chosenLanguage==='en-US' ? `Answer only the name of the people who said that sentence: "${sentence}"` : `Responda apenas o nome da pessoa que disse essa frase: "${sentence}"`
      });
      setName(completion.data.choices[0].text || "")
      if(chosenLanguage==='en-US'){
        sayThis("Nice to meet you " + completion.data.choices[0].text + ". What language would you like to learn today?", chosenLanguage)
      }
      else if(chosenLanguage==='pt-BR'){
        sayThis("Bom te conhecer, " + completion.data.choices[0].text + ". Qual língua você quer aprender hoje?", chosenLanguage)
      }
    } catch(error) {
      console.log("error: ",  error)
    }
  },[chosenLanguage])

  const findLanguageWithChatGPT = useCallback(async (sentence: string) => {
    try {
      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: chosenLanguage==='en-US' ? `Answer only the language the one who said this wants to learn: "${sentence}"` : `Responda apenas a língua que a pessoa que disse isso quer aprender: "${sentence}"`
      });
      setName(completion.data.choices[0].text || "")
      if(chosenLanguage==='en-US'){
        sayThis("Ok, I'm going to prepare a sentence to you starts with", chosenLanguage)
      }
      else if(chosenLanguage==='pt-BR'){
        sayThis("Ok, eu vou preparar uma frase para você começar", chosenLanguage)
      }
      const completion2 = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: chosenLanguage==='en-US' ? `Write 1 sentence in the present tense in ${completion.data.choices[0].text}` : `Escolha um tema e escreva apenas 1 frase no tempo presente em ${completion.data.choices[0].text}.`
      });
      let sentencesChatGPT = "";
      for (let i = 0; i < 10; i++) {
        sentencesChatGPT += completion2.data.choices[i].text + '\n'
        if (completion2.data.choices.length <= i+1) {
          break
        }
      }
      setSetencesToLearn(sentencesChatGPT || "")
    } catch(error) {
      console.log("error: ",  error)
    }
  },[chosenLanguage, setSetencesToLearn])

  useEffect(() => {
    if (currSentence.current) {
      findNameWithChatGPT(currSentence.current)
      currSentence.current = ""
      setTimeout(async () => {
        setIsRecording(true)
        visualize()
        getUserMedia({ video: false, audio: true })
        .then(function(stream: any) {
          micStream.setStream(stream);
          const audioCtx = Visualizer.getContext();
          audioCtx.resume().then(() => {
            const analyser = Visualizer.getAnalyser()
            const sourceNode = audioCtx.createMediaStreamSource(stream)
            sourceNode.connect(analyser)
          })
        }).catch(function(error: any) {
          console.log(error);
        });
        await TranscribeClient.startRecording(micStream, chosenLanguage, (m: any) => {
          learnSentence.current += m
          if (learnSentence.current.split(' ').length === 4) {
            setIsRecording(false)
            micStream&&micStream.stop();
            Visualizer.resetContext();
          }
        });
      }, 7000)
    }
  },[currSentence.current, findNameWithChatGPT, learnSentence])

  useEffect(() => {
    if (learnSentence.current) {
      findLanguageWithChatGPT(learnSentence.current)
      learnSentence.current = ""
    }
  },[learnSentence.current, findLanguageWithChatGPT])

  return (
    <main className={styles.main} ref={mainRef} >
      <p id={styles.t1} className={styles.welcomeText}>Welcome to AI Learner!</p>
      <p id={styles.t2} className={styles.welcomeText}>Take <strong className={styles.strongWord}>only 20 hours</strong> to have <strong className={styles.strongWord}>15 minutes conversation</strong> with a native.</p>
      <p id={styles.t3} className={styles.welcomeText}>Starts here:</p>
      <div className={styles.selectLanguageBox}>
        <p className={styles.welcomeText}>Select your language: </p>
        <select name="languages" id="languages" onChange={(e) => setChosenLanguage(e.target.value)}>
          <option value="empty"></option>
          <option value="en-US">English</option>
          <option value="pt-BR">Português</option>
          <option disabled={true} value="ru-RU">Русский - soon</option>
        </select>
      </div>
      <div className={!!chosenLanguage && chosenLanguage !== 'empty' ? styles.microfoneDiv : styles.hiddenMicrofoneDiv}>
        <div className={styles.microfoneBox}>
          <canvas ref={visualizerRef} style={{display: isRecording ? 'block':'none'}}/>
        </div>
        <button onClick={async () => {
          currSentence.current = ""
          if (chosenLanguage === 'en-US') {
            await sayThis("Hey there. I'm Joanna. What is your name?", chosenLanguage)
          }
          else if(chosenLanguage === 'pt-BR'){
            await sayThis("Olá! Eu sou a Camila. Qual o seu nome?", chosenLanguage)
          }
          setTimeout(async () => {
            setIsRecording(true)
            visualize()
            getUserMedia({ video: false, audio: true })
            .then(function(stream: any) {
              micStream.setStream(stream);
              const audioCtx = Visualizer.getContext();
              audioCtx.resume().then(() => {
                const analyser = Visualizer.getAnalyser()
                const sourceNode = audioCtx.createMediaStreamSource(stream)
                sourceNode.connect(analyser)
              })
            }).catch(function(error: any) {
              console.log(error);
            });
            await TranscribeClient.startRecording(micStream, chosenLanguage, (m: any) => {
              currSentence.current += m
              if (currSentence.current.split(' ').length === 4) {
                setIsRecording(false)
                micStream&&micStream.stop();
                Visualizer.resetContext();
              }
            });
          }, 4000)
        }} type="button">Talk with me</button>
        {/* <button onClick={async () => {
          setIsRecording(true)
          visualize()
          getUserMedia({ video: false, audio: true })
            .then(function(stream: any) {
              micStream.setStream(stream);
              const audioCtx = Visualizer.getContext();
              audioCtx.resume().then(() => {
                const analyser = Visualizer.getAnalyser()
                const sourceNode = audioCtx.createMediaStreamSource(stream)
                sourceNode.connect(analyser)
              })
            }).catch(function(error: any) {
              console.log(error);
            });
            await TranscribeClient.startRecording(micStream, chosenLanguage, (m: any) => console.log(m));
        }} type="button">Start</button>
        <button onClick={() => {
          setIsRecording(false)
          micStream&&micStream.stop();
          Visualizer.resetContext();
        }} type="button">Stop</button> */}
        <div style={{display: setencesToLearn ? "flex":'none', flexDirection: "column", marginTop: "50px"  }}>
          <p style={{color: 'white'}}>{setencesToLearn}</p>
        </div>
      </div>
    </main>
  )
}
