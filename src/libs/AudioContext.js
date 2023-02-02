import MicrophoneStream from 'microphone-stream';

var micStream = new MicrophoneStream();

var audioCtx = micStream.context;

let analyser = audioCtx.createAnalyser();

const AudioContext  = {

  getAudioContext() {
    return audioCtx;
  },

  getMicStream() {
    return micStream;
  },

  resetContext() {
    micStream = new MicrophoneStream();
    audioCtx = micStream.context;
  },

  getAnalyser() {
    return analyser;
  },

  resetAnalyser() {
    analyser = audioCtx.createAnalyser();
  },

  decodeAudioData() {
    audioCtx.decodeAudioData(audioData).then(function(decodedData) {
      // use the decoded data here
    });
  }

}

export default AudioContext;