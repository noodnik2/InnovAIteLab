import React, {Dispatch, useState} from 'react';

import CreatableSelect from 'react-select/creatable';
import {Option, createOption} from "@/components/CommonProps";

interface MultiSelectorProps {
    labels: string[]
    selectedLabels?: string[]
    onChange: Dispatch<string[] | undefined | null>
}

const MultiSelector = ({labels, onChange, selectedLabels}: MultiSelectorProps): JSX.Element => {

    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState(labels.map(l => createOption(l)));
    const [selectedOptions, setSelectedOptions]
        = useState<Option[] | undefined | null>(selectedLabels? selectedLabels.map(sl => createOption(sl)): null);

    const setAndDispatchValue = (options: Option[] | undefined) => {
        setSelectedOptions(options)
        onChange(options?.map(o => o.label))
    }

    const handleCreate = (inputValue: string) => {
        setIsLoading(true);
        const newOption = createOption(inputValue);
        setIsLoading(false);
        setOptions((prev) => [...prev, newOption]);
        setAndDispatchValue(selectedOptions?.concat(newOption))
    };

    return (
        <CreatableSelect
            isClearable
            isMulti
            isDisabled={isLoading}
            isLoading={isLoading}
            onChange={(newValue) => setAndDispatchValue(newValue?.concat())}
            onCreateOption={handleCreate}
            options={options}
            value={selectedOptions}
        />
    );
};

export default MultiSelector;