#!/usr/bin/env python3

import os
import re
import json
import argparse
import logging
from typing import Dict, List, Any
from mido import MidiFile
from pathlib import Path
from typing import Iterator, Union


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MidiMetadataReader:
    def __init__(self):
        """Initialize the MIDI metadata reader."""
        pass

    def extract_metadata_tags(self, midi_path: str) -> List[str]:
        """
        Extract metadata tags from a MIDI file.

        Args:
            midi_path: Path to the MIDI file

        Returns:
            List of metadata tag strings in the format specified
        """
        metadata_tags = []

        try:
            midi = MidiFile(midi_path)

            for track_idx, track in enumerate(midi.tracks):
                for msg in track:
                    if not msg.is_meta:
                        continue

                    if msg.type in ('track_name', 'instrument_name'):
                        text = clean_text(msg.name)
                        if text:
                            metadata_tags.append(f"{msg.type}: {clean_text(msg.name)}")
                    elif msg.type in ('copyright', 'text', 'lyrics', 'marker', 'cue_point'):
                        text = clean_text(msg.text)
                        if text:
                            metadata_tags.append(f"{msg.type}: {clean_text(msg.text)}")
                    elif msg.type in 'time_signature':
                        metadata_tags.append(f"{msg.type}: {msg.numerator}")
                    elif msg.type in 'key_signature':
                        metadata_tags.append(f"{msg.type}: {msg.key}")

            # If we didn't find any metadata, add a note
            if not metadata_tags:
                metadata_tags.append('No metadata found')

            return metadata_tags

        except Exception as e:
            logger.error(f"Error extracting metadata from {midi_path}: {e}")
            return [f"Error: {str(e)}"]

    def process_files(self, midi_files: List[str], output_file: str = None) -> Dict[str, List[str]]:
        """
        Process multiple MIDI files and extract their metadata.

        Args:
            midi_files: List of paths to MIDI files
            output_file: Optional path to write the output JSON

        Returns:
            Dictionary with MIDI file paths as keys and metadata tag lists as values
        """
        results = {}

        for midi_path in midi_files:
            if not os.path.exists(midi_path):
                logger.warning(f"File not found: {midi_path}")
                continue

            logger.info(f"Processing {midi_path}")

            # Use the relative path as key, as in the example
            # This preserves directory structure like "gs/11daes.mid"
            rel_path = midi_path
            if os.path.isabs(midi_path):
                # Try to make the path relative if it's absolute
                try:
                    rel_path = os.path.relpath(midi_path)
                except ValueError:
                    # Keep as is if we can't make it relative
                    pass

            metadata_tags = self.extract_metadata_tags(midi_path)
            results[rel_path] = metadata_tags

        # Write to output file if specified
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results written to {output_file}")

        return results

    # def print_raw_midi_info(self, midi_path: str):
    #     """
    #     Print raw MIDI message information for debugging purposes.
    #
    #     Args:
    #         midi_path: Path to the MIDI file
    #     """
    #     try:
    #         midi = MidiFile(midi_path)
    #         print(f"\nRaw MIDI information for {midi_path}:")
    #
    #         for i, track in enumerate(midi.tracks):
    #             print(f"\nTrack {i}:")
    #             for msg in track:
    #                 if msg.is_meta:
    #                     print(f"  Meta: {msg}")
    #     except Exception as e:
    #         print(f"Error reading MIDI file: {e}")


def find_midi_files(start_path: Union[str, Path]) -> Iterator[Path]:
    """
    Recursively find all .mid files starting from the given path.

    Args:
        start_path: The directory path to start searching from

    Yields:
        Path objects for each .mid file found
    """
    # Convert to Path object if a string is provided
    start_path = Path(start_path)

    # Ensure the path exists and is a directory
    if not start_path.exists():
        raise FileNotFoundError(f"The path {start_path} does not exist")
    if not start_path.is_dir():
        raise NotADirectoryError(f"The path {start_path} is not a directory")

    # Walk through the directory tree
    for item in start_path.rglob("*.mid"):
        if item.is_file():
            yield item


def clean_text(text):
    if not text:
        return ''
    # text = str(text).strip()
    # Remove non-printable characters
    text = re.sub(r'[^\x20-\x7E]', '', text)
    return text.strip()


def main():
    parser = argparse.ArgumentParser(description='Extract metadata tags from MIDI files')
    parser.add_argument('midi_files', nargs='+', help='Paths to MIDI files')
    parser.add_argument('--output', '-o', help='Path to write the output JSON file')
    parser.add_argument('--pretty', '-p', action='store_true', help='Print pretty JSON to console')
    parser.add_argument('--debug', '-d', action='store_true', help='Print raw MIDI message information')

    args = parser.parse_args()

    # Create reader
    reader = MidiMetadataReader()

    # # Debug mode - print raw message info
    # if args.debug:
    #     for midi_path in args.midi_files:
    #         if os.path.exists(midi_path):
    #             reader.print_raw_midi_info(midi_path)

    # Initialize an empty list to store midi files
    midi_files: List[str] = []

    # Assuming args.midi_files is already defined and is an iterable
    for mf in args.midi_files:
        midi_files.append(mf)  # Append each file to the list instead of using +=

    # Check if there's exactly one file and it's a directory
    # Using 'and' instead of '&' for logical AND operation
    if len(midi_files) == 1 and os.path.isdir(midi_files[0]):
        leading_path = midi_files[0]
        midi_files.clear()
        # Assuming find_midi_files() is already defined
        for midi_file in find_midi_files(leading_path):
            midi_files.append(midi_file)  # Convert Path object to string and append

    # Process files normally
    results = reader.process_files(midi_files, args.output)

    # Print to console if requested or if no output file specified
    if args.pretty or not args.output:
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()