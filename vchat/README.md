# Voice Chat

Explore available APIs to enable a voice/audio based human/machine conversational 
user interface.  In particular, explore some of the available APIs offered by
OpenAI and Google, and support for various spoken languages.

## Installation

**CAREFUL!: See `Setup`, below - ensure you're using the built-in `conda` environment (`.conda`) before
installing pakages!**; e.g.:

```shell
$ conda env list
$ conda activate "$(basename `pwd`)"
```

```shell
$ project_name="$(basename `pwd`)"
$ conda create -n "$project_name" python=3.10
$ conda activate "$project_name" 
$ brew install portaudio
$ pip install -r requirements.txt
```

## Configuration

There generally is no configuration needed in order to run; however:

- In order to use the ["Whisper API" interpreter](https://github.com/Uberi/speech_recognition#whisper-api-for-whisper-api-users),
you'll need to register your `OPENAI_API_KEY` value in the `.env` file (see [.env.template](./.env.template)).
- Only English is supported by default for the [Sphinx](https://github.com/Uberi/speech_recognition/blob/8b07762f80dfec2d34fb4c40b8eddbb7ec503521/reference/pocketsphinx.rst)
  interpreter; you'll have to add other languages yourself if you need them.

## Invocation

```shell
$ python chatter.py
```

Assuming everything initializes properly, you should be able now to either
use command prompts to modify the configuration (e.g., language and/or 
choose which interpreter is being used), and have your "chat" conversation
accordingly.

### Command Prompts

While running, the following voice commands can be used to control
runtime behavior:

- "__Help__" - print this help message
- "__Let's speak _{_ Hebrew _|_ French _|_ Spanish _|_ German _}___" 
- "__Please use _{_ Sphinx _|_ Whisper _|_ Whisper API _|_ Google _}___" - select underlying
  [`speech_recognition` Speech recognition engine](https://github.com/Uberi/speech_recognition#speechrecognition)
  to use
- "__Goodbye__" - _exits program (or `^C` / `os.SIGINT` works as well)_

## References
- [Speech Recognition in Python](https://www.slanglabs.in/blog/automatic-speech-recognition-in-python-programs)
- [5 Best Speech Recognition Engines](https://www.rev.com/blog/resources/the-5-best-open-source-speech-recognition-engines-apis)
- [State of Python Speech Recognition in 2021](https://www.assemblyai.com/blog/the-state-of-python-speech-recognition-in-2021/)
- [Top Free Speech To Text Engines](https://www.assemblyai.com/blog/the-top-free-speech-to-text-apis-and-open-source-engines/)
- [DeepSpeech](https://github.com/mozilla/DeepSpeech)
- [PocketShpinx](https://github.com/cmusphinx/pocketsphinx)
- [SpeechRecognition](https://github.com/Uberi/speech_recognition)
- [macos_speech](https://github.com/tibOin/macos_speech)
