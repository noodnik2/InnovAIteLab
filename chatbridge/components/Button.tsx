import React from 'react';

const BUTTON_STYLES = "border border-blue-700 rounded m-1 py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-bold"

type ButtonType = 'submit' | 'reset' | 'button' | undefined;

interface ButtonProps {
    type?: ButtonType
    name: string
    onClick: () => void
}

const Button = ({type = 'button', name, onClick}: ButtonProps): JSX.Element => {
    return <button type={type} onClick={onClick} className={BUTTON_STYLES}>{name}</button>;
};

export default Button;
