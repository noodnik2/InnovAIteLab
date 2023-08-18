import React from 'react';
import {TextAreaProps} from "@/components/CommonProps";
import LogWindow from "@/components/LogWindow";

interface MessageConsumerProps extends TextAreaProps {
    consumerText: string[]
}

const MessageConsumer = ({textAreaClassName = "", consumerText}: MessageConsumerProps): JSX.Element => {

    return (
        <div>
            <span>
                <span className="h-1 p-1 m-1">Chat Response</span>
            </span>
            <div>
                <LogWindow
                    loggerText={consumerText}
                    textAreaClassName={textAreaClassName}
                    loggerDescription="Chat Response(s)"
                />
            </div>
        </div>
    );
};

export default MessageConsumer;