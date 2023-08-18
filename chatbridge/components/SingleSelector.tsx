import React, {Dispatch, useState} from 'react';

import CreatableSelect from 'react-select/creatable';
import {Option, createOption} from "@/components/CommonProps";

interface SingleSelectorProps {
    labels: string[]
    selectedOption?: string
    onChange: Dispatch<string | undefined | null>
}

const SingleSelector = ({labels, onChange, selectedOption}: SingleSelectorProps): JSX.Element => {

    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState(labels.map(t => createOption(t)));
    const [currentlySelectedOption, setCurrentlySelectedOption] = useState<Option | undefined | null>(selectedOption? createOption(selectedOption): null);

    const setAndDispatchValue = (option: Option | null | undefined) => {
        setCurrentlySelectedOption(option)
        onChange(option?.label)
    }

    const handleCreate = (inputValue: string) => {
        setIsLoading(true);
        const newOption = createOption(inputValue);
        setIsLoading(false);
        setOptions((prev) => [...prev, newOption]);
        setCurrentlySelectedOption(newOption)
        setAndDispatchValue(newOption)
    };

    return (
        <CreatableSelect
            isClearable
            isDisabled={isLoading}
            isLoading={isLoading}
            onChange={(newValue) => setAndDispatchValue(newValue)}
            onCreateOption={handleCreate}
            options={options}
            value={currentlySelectedOption}
        />
    );
};

export default SingleSelector;