from macos_speech import Synthesizer
import speech_recognition as sr
import openai
from dotenv import dotenv_values
import signal
import os
import re

# keep linter happy (too lazy to fix IntelliJ's configuration ;-)
from builtins import print, len


class VoiceChatter:

    # Supported Languages: constants conform to ISO_639-1 code for the language
    LANGUAGES = {
        # See https://lingohub.com/developers/supported-locales/language-designators-with-regions
        "english": "en-US", "אנגלית": "en-US",
        "hebrew": "he-IL", "עברית": "he-IL",
        "spanish": "es-ES", "ספרדית": "es-ES",
        "french": "fr-FR", "צרפתית": "fr-FR",
        "german": "de-DE", "גרמנית": "de-DE"
    }

    SPEAKERS = {
        # These are standard "Speaker" names available in MacOs, specialized for the given language
        # See: https://support.apple.com/en-us/HT206175 or execute command in MacOs: "say -v \?"
        "en-US": "Agnes",
        "he": "Carmit",
        "he-IL": "Carmit",
        "fr": "Thomas",
        "es": "Monica",
        "de": "Anna"
    }

    # Supported Speech Recognition Engines: see https://github.com/Uberi/speech_recognition#speechrecognition
    SPHINX_SRE = "sphinx"
    GOOGLE_SRE = "google"
    WHISPER_SRE = "whisper"
    WHISPERAPI_SRE = "whisper-api"
    INTERPRETERS = [SPHINX_SRE, GOOGLE_SRE, WHISPER_SRE, WHISPERAPI_SRE]

    CONFIG = dotenv_values(".env")

    def __init__(self):
        self.recognizer = None
        self.interpreter = None
        self.stop_listening = None
        self.stop_flag = False
        self.lang_code = None
        self.speaker = None

    def orchestrate_conversation(self, synchronous=True):

        # See configuration properties:
        # - https://pypi.org/project/SpeechRecognition/3.1.0/ #Reference
        # - https://github.com/Uberi/speech_recognition
        #
        self.recognizer = sr.Recognizer()
        # self.recognizer.energy_threshold = 4000
        # self.recognizer.dynamic_energy_threshold = True
        # self.recognizer.dynamic_energy_adjustment_damping = 0.15
        # self.recognizer.dynamic_energy_adjustment_ratio = 1.5
        # self.recognizer.pause_threshold = 0.8

        mic = sr.Microphone()
        with mic as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.2)

        signal.signal(signal.SIGINT, self.signal_handler)

        # Set initial defaults - preferably an interpreter that can run offline
        # self.set_interpreter([VoiceChatter.WHISPER_SRE])
        self.set_interpreter([VoiceChatter.WHISPERAPI_SRE])
        # self.set_interpreter([VoiceChatter.GOOGLE_SRE])
        self.set_language("english")

        print("conversation started")

        self.print_help()
        # self.process_text("Hello!")
        if synchronous:
            # Synchronous: actively participate in the conversation, looping for each message
            while not self.stop_flag:
                print("listening...")
                with mic as source:
                    audio = self.recognizer.listen(source)
                self.process_audio_received(self.recognizer, audio)
            return

        # Asynchronous: spawn off the conversation into its own background thread
        self.stop_listening = self.recognizer.listen_in_background(mic, self.process_audio_received)
        print(f'launched asynchronous listener')
        print(f'waiting for completion signal')
        signal.sigwait([signal.SIGINT])
        print(f'completion signal received')

    def shutdown(self):
        shutdown_fn = self.stop_listening
        self.stop_listening = None
        if shutdown_fn is not None:
            shutdown_fn(wait_for_stop=True)

    def close(self):
        self.process_text("bye bye!")
        self.shutdown()
        print("conversation finished")

    def signal_handler(self, sig, frame):
        print('Signal received; shutting down.')
        self.shutdown()
        self.stop_flag = True

    def process_audio_received(self, recognizer, audio):

        print(f'interpreting with {self.interpreter}...')

        raw_text = ''
        try:
            match self.interpreter:
                case VoiceChatter.SPHINX_SRE:
                    # NOTE: works offline
                    raw_text = recognizer.recognize_sphinx(audio, language=self.lang_code)
                case VoiceChatter.WHISPER_SRE:
                    # NOTE: works offline
                    raw_text = recognizer.recognize_whisper(audio, language=self.lang_code.split("-")[0])
                case VoiceChatter.WHISPERAPI_SRE:
                    # NOTE: Whisper API does its own language detection, so it doesn't accept a 'language' parameter!
                    # See https://discuss.huggingface.co/t/language-detection-with-whisper/26003
                    raw_text = recognizer.recognize_whisper_api(audio, api_key=VoiceChatter.CONFIG["OPENAI_API_KEY"])
                case VoiceChatter.GOOGLE_SRE:
                    raw_text = recognizer.recognize_google(audio, language=self.lang_code)

        except sr.UnknownValueError as e:
            # print(f'UnknownValueError({e}); audio not understood')
            return

        except sr.RequestError as e:
            print(f'RequestError({e})')
            return

        except sr.WaitTimeoutError as e:
            print(f'WaitTimeoutError({e})')
            return

        except sr.TranscriptionNotReady as e:
            print(f'TranscriptionNotReady({e})')
            return

        except sr.SetupError as e:
            print(f'SetupError({e})')
            return

        if self.process_command(raw_text):
            return

        self.process_text(raw_text)

    def process_command(self, raw_text):

        sentence = raw_text.strip(" .").split()
        if len(sentence) == 0:
            print('ignoring empty text')
            return True

        # print(f'received sentence({sentence})')

        args = self.is_command([["help"], ["עזרה"]], sentence)
        if args is not None and len(args) == 0:
            self.print_help()
            return True

        args = self.is_command([["lets", "speak"], ["באו", "נדבר"]], sentence)
        if args is not None and len(args) > 0:
            if self.set_language(args):
                print(f'switched to language({self.lang_code}) with speaker({self.speaker})')
            return True

        args = self.is_command([["please", "use"], ["בבקשה", "להשתמש"]], sentence)
        if args is not None and len(args) > 0:
            if self.set_interpreter(args):
                print(f'interpreter now {self.interpreter}')
            return True

        args = self.is_command([["goodbye"], ["להתראות"]], sentence)
        if args is not None:
            os.kill(os.getpid(), signal.SIGINT)
            self.stop_flag = True
            print("ok; leaving")
            return True

        return False

    def print_help(self):
        help_text = [
            "You can say things (or their language equivalents) like:",
            '- "Help"',
            '- "Let\'s speak { English | Hebrew | Spanish | French | German }"',
            '- "Please use { Sphinx | Whisper | Whisper API | Google }"',
            '- "Goodbye"',
        ]
        for ht in help_text:
            print(ht)

    def is_command(self, commands, sentence):
        for command in commands:
            if len(sentence) < len(command):
                continue
            sentence_prefix = [re.sub("['?!]", "", w.lower()) for w in sentence[0:len(command)]]
            if command != sentence_prefix:
                continue
            return sentence[len(command):]
        return None

    def process_text(self, text):
        answer, role = vc.ask_chatgpt(text)
        print(f'{self.speaker} (as {role}): {answer}')
        speaker = Synthesizer()
        speaker.voice = self.speaker
        speaker.say(answer)

    def set_language(self, new_language_raw):
        new_language_clean = "".join(new_language_raw).lower().strip(" .")
        if new_language_clean not in VoiceChatter.LANGUAGES:
            print(f'unrecognized language({new_language_clean}); ignored')
            return False
        new_language_code = VoiceChatter.LANGUAGES[new_language_clean]
        if new_language_code not in VoiceChatter.SPEAKERS:
            print(f'no speaker found for language({new_language_code}); ignored')
            return False
        new_speaker = VoiceChatter.SPEAKERS[new_language_code]
        # print(f'setting lang_code({new_language_code}) and speaker({new_speaker})')
        self.lang_code = new_language_code
        self.speaker = new_speaker
        return True

    def set_interpreter(self, new_interpreter_args):
        new_interpreter = "-".join(new_interpreter_args).lower()
        if new_interpreter not in VoiceChatter.INTERPRETERS:
            print(f'unrecognized interpreter({new_interpreter_args}); ignored')
            return False
        self.interpreter = new_interpreter
        return True

    def ask_chatgpt(self, question):
        openai.api_key = VoiceChatter.CONFIG["OPENAI_API_KEY"]
        print(f'Asking ChatGPT (as user): {question}')
        response = openai.ChatCompletion.create(
            # model="gpt-3.5-turbo",
            model="gpt-4",
            temperature=0.05,
            messages=[
                {"role": "user", "content": question},
            ]
        )
        chatgpt_response_message = response["choices"][0]["message"]
        answer = chatgpt_response_message["content"]
        role = chatgpt_response_message["role"]
        return answer, role


if __name__ == "__main__":
    vc = VoiceChatter()
    print("orchestrating conversation")
    vc.orchestrate_conversation(synchronous=True)
    # vc.orchestrate_conversation(synchronous=False)
    vc.close()
