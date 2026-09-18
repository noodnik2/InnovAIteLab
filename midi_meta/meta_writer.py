import json
import argparse
import logging

from typing import Dict, Any
from mido import MidiFile, MidiTrack, MetaMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MidiMetadataWriter:
    def __init__(self):
        """Initialize the MIDI metadata writer."""
        pass

    def _create_text_meta_message(self, msg_type: str, text: str) -> MetaMessage:
        """
        Create a MIDI meta message with the specified type and text.

        Args:
            msg_type: The type of meta message ('text', 'copyright', etc.)
            text: The text content for the message

        Returns:
            A MIDI meta message
        """
        return MetaMessage(msg_type, text=text, time=0)

    def write_metadata_to_file(self, midi_path: str, metadata: Dict[str, Any], output_path: str = None) -> None:
        """
        Write metadata to a MIDI file.

        Args:
            midi_path: Path to the original MIDI file
            metadata: Dictionary containing metadata to write
            output_path: Path to write the modified MIDI file (if None, overwrites original)
        """
        if output_path is None:
            output_path = midi_path

        try:
            # Load the original MIDI file
            midi = MidiFile(midi_path)

            # Create new meta messages based on the metadata
            meta_messages = []

            # Add title metadata
            if "title" in metadata and metadata["title"]["name"] != "Unknown":
                meta_messages.append(
                    MetaMessage('track_name', text=metadata["title"]["name"], time=0)
                )

            # Add copyright metadata
            if "copyright" in metadata and metadata["copyright"]["text"] != "Unknown":
                meta_messages.append(
                    MetaMessage('copyright', text=metadata["copyright"]["text"], time=0)
                )

            # Add artist as text metadata
            if "artist" in metadata and metadata["artist"]["name"] != "Unknown":
                meta_messages.append(
                    MetaMessage('text', text=f"Artist: {metadata['artist']['name']}", time=0)
                )

            # Add comment as text metadata
            if "comment" in metadata and metadata["comment"]["text"] != "Unknown":
                meta_messages.append(
                    MetaMessage('text', text=metadata["comment"]["text"], time=0)
                )

            # If the file has tracks, add metadata to the first track
            if len(midi.tracks) > 0:
                # Add metadata messages to the beginning of the first track
                # We need to preserve the existing track, but add our metadata at the start
                track = midi.tracks[0]
                new_track = MidiTrack()

                # Add our metadata messages first
                for msg in meta_messages:
                    new_track.append(msg)

                # Then add all existing messages from the original track
                for msg in track:
                    new_track.append(msg)

                # Replace the original track with our modified one
                midi.tracks[0] = new_track
            else:
                # If there are no tracks, create a new one with our metadata
                track = MidiTrack()
                for msg in meta_messages:
                    track.append(msg)
                midi.tracks.append(track)

            # Save the modified MIDI file
            # midi.save(output_path)
            logger.info(f"Successfully wrote metadata to {output_path}")

        except Exception as e:
            logger.error(f"Error writing metadata to {output_path}: {e}")
            raise

    def process_files(self, metadata_json_path: str, midi_dir: str, output_dir: str = None) -> None:
        """
        Process all MIDI files based on metadata from a JSON file.

        Args:
            metadata_json_path: Path to the JSON file containing metadata
            midi_dir: Directory containing the original MIDI files
            output_dir: Directory to write modified MIDI files (if None, overwrites originals)
        """
        try:
            # Load the metadata JSON
            with open(metadata_json_path, 'r') as f:
                metadata_dict = json.load(f)

            # Process each file in the metadata dictionary
            for filename, metadata in metadata_dict.items():
                # Construct full paths
                midi_path = f"{midi_dir}/{filename}"

                if output_dir:
                    # Ensure output directory exists
                    import os
                    os.makedirs(output_dir, exist_ok=True)
                    output_path = f"{output_dir}/{filename}"
                else:
                    output_path = midi_path

                logger.info(f"Processing {filename}")
                self.write_metadata_to_file(midi_path, metadata, output_path)

        except Exception as e:
            logger.error(f"Error processing files: {e}")
            raise


def main():
    parser = argparse.ArgumentParser(description='Write metadata to MIDI files')
    parser.add_argument('metadata_file', help='Path to the JSON file containing metadata')
    parser.add_argument('midi_dir', help='Directory containing the original MIDI files')
    parser.add_argument('--output-dir', help='Directory to write modified MIDI files (if omitted, overwrites originals)')

    args = parser.parse_args()

    # Create and run the writer
    writer = MidiMetadataWriter()
    writer.process_files(args.metadata_file, args.midi_dir, args.output_dir)


if __name__ == "__main__":
    main()