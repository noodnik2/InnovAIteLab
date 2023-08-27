import {TextAreaProps} from "@/components/CommonProps";
import React, {useEffect, useRef} from "react";

interface LogWindowProps extends TextAreaProps {
    loggerDescription?: string
    loggerText: string[]
}

const LogWindow = ({textAreaClassName = "", loggerDescription = '', loggerText}: LogWindowProps): JSX.Element => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    useEffect(() => {
        if (textareaRef && textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [loggerText]);

    return (
        <div>
            <textarea
                ref={textareaRef}
                className={textAreaClassName}
                readOnly
                placeholder={loggerDescription}
                value={loggerText.join('\n')}
                onChange={e => e.target.scrollTop = e.target.scrollHeight}
            />
        </div>
    );
};

export default LogWindow;