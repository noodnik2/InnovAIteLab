import argparse
import logging
import os
from midi_metadata_extractor import MidiMetadataExtractor
from midi_metadata_writer import MidiMetadataWriter

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Extract and write metadata for MIDI files')

    # Common arguments
    parser.add_argument('--midi-dir', required=True, help='Directory containing the MIDI files')

    # Create subparsers for different operations
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Extract command
    extract_parser = subparsers.add_parser('extract', help='Extract metadata from MIDI files')
    extract_parser.add_argument('--input-json', required=True,
                                help='Path to the input JSON file containing MIDI metadata tags')
    extract_parser.add_argument('--output-json', required=True,
                                help='Path to write the extracted metadata JSON file')
    extract_parser.add_argument('--model-type', default='openai', choices=['openai', 'ollama'],
                                help='Type of LLM to use (default: openai)')
    extract_parser.add_argument('--model-name', default='gpt-4',
                                help='Name of the specific model to use (default: gpt-4)')

    # Write command
    write_parser = subparsers.add_parser('write', help='Write metadata to MIDI files')
    write_parser.add_argument('--metadata-json', required=True,
                              help='Path to JSON file containing metadata to write')
    write_parser.add_argument('--output-dir',
                              help='Directory to write modified MIDI files (if omitted, overwrites originals)')

    # Full workflow command
    workflow_parser = subparsers.add_parser('workflow', help='Run full extraction and writing workflow')
    workflow_parser.add_argument('--input-json', required=True,
                                 help='Path to the input JSON file containing MIDI metadata tags')
    workflow_parser.add_argument('--metadata-json', required=True,
                                 help='Path to write the intermediate metadata JSON file')
    workflow_parser.add_argument('--output-dir',
                                 help='Directory to write modified MIDI files (if omitted, overwrites originals)')
    workflow_parser.add_argument('--model-type', default='openai', choices=['openai', 'ollama'],
                                 help='Type of LLM to use (default: openai)')
    workflow_parser.add_argument('--model-name', default='gpt-4',
                                 help='Name of the specific model to use (default: gpt-4)')

    args = parser.parse_args()

    if args.command == 'extract':
        # Create and run the extractor
        logger.info("Extracting metadata from MIDI files...")
        extractor = MidiMetadataExtractor(model_type=args.model_type, model_name=args.model_name)
        extractor.process_midi_metadata(args.input_json, args.output_json)

    elif args.command == 'write':
        # Create and run the writer
        logger.info("Writing metadata to MIDI files...")
        writer = MidiMetadataWriter()
        writer.process_files(args.metadata_json, args.midi_dir, args.output_dir)

    elif args.command == 'workflow':
        # Run the full workflow
        logger.info("Running full metadata workflow...")

        # Extract metadata
        logger.info("Step 1: Extracting metadata...")
        extractor = MidiMetadataExtractor(model_type=args.model_type, model_name=args.model_name)
        extractor.process_midi_metadata(args.input_json, args.metadata_json)

        # Write metadata back to files
        logger.info("Step 2: Writing metadata to MIDI files...")
        writer = MidiMetadataWriter()
        writer.process_files(args.metadata_json, args.midi_dir, args.output_dir)

        logger.info("Workflow completed successfully!")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()