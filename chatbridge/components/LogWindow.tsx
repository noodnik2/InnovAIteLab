import {TextAreaProps} from "@/components/CommonProps";
import React from "react";

interface LogWindowProps extends TextAreaProps {
    loggerDescription?: string
    loggerText: string[]
}

const LogWindow = ({textAreaClassName = "", loggerDescription = '', loggerText}: LogWindowProps): JSX.Element => {

    return (
        <div>
            <textarea
                className={textAreaClassName}
                readOnly
                placeholder={loggerDescription}
                value={loggerText.join('\n')}
            />
        </div>
    );
};

export default LogWindow;