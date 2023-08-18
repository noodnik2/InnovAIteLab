import React, {useState} from 'react';
import Button from "@/components/Button";
import SingleSelector from "@/components/SingleSelector";
import {TextAreaProps} from "@/components/CommonProps";
import { TbArrowBigRightLines } from 'react-icons/tb';

interface MessageProducerProps extends TextAreaProps {
    knownModels?: string[]
    model: string
    onMessage: (message: string) => void
    onModel: (model: string) => void
}

const MessageProducer = ({textAreaClassName = "", knownModels = [], model, onMessage, onModel}: MessageProducerProps): JSX.Element => {

    const [message, setMessage] = useState('')

    return (
        <div>
            <span>
                <Button name="Clear" onClick={() => setMessage('')} />
                <Button name="Send" onClick={() => onMessage(message)} />
                <span className="h-1 p-1 m-1">To Model <TbArrowBigRightLines className="inline"/></span>
                <span className="w-96 w-fit float-right">
                    <SingleSelector
                        labels={knownModels}
                        selectedOption={model}
                        onChange={
                            model => {
                                if (model) {
                                    onModel(model)
                                }
                            }
                        }
                    />
                </span>
            </span>
            <div>
                <textarea
                    className={textAreaClassName}
                    placeholder="Enter the text to send to the selected model here"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                />
            </div>
        </div>
    );
};

export default MessageProducer;