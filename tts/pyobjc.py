import objc

# Import the required classes from the AppKit framework
from AppKit import NSSpeechSynthesizer, NSSpeechBoundaryImmediate

def text_to_speech(text):
    # Create an instance of the NSSpeechSynthesizer class
    synthesizer = NSSpeechSynthesizer.alloc().initWithVoice_(None)

    # Set the speech rate (optional)
    synthesizer.setRate_(175.0)  # Adjust the rate as needed

    # Start speaking the provided text
    synthesizer.startSpeakingString_(text)

    # Wait for the speech to finish
    while synthesizer.isSpeaking():
        objc.NSRunLoop.currentRunLoop().runUntilDate_(objcNSDate.dateWithTimeIntervalSinceNow_(0.1))

    # Release the synthesizer
    synthesizer.release()

if __name__ == "__main__":
    input_text = input("Enter the text you want to convert to speech: ")
    text_to_speech(input_text)
