import { FC, useState } from 'react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from 'react-icons/fi';

type Props = {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    icon: 'email' | 'lock' | 'user';
    isPassword?: boolean;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
};

const InputField: FC<Props> = ({
                                   label,
                                   name,
                                   type,
                                   placeholder,
                                   icon,
                                   isPassword = false,
                                   value,
                                   onChange,
                                   required,
                               }) => {
    const [showPassword, setShowPassword] = useState(false);

    const IconComponent =
        icon === 'email' ? FiMail : icon === 'user' ? FiUser : FiLock;

    return (
        <div>
            <label htmlFor={name} className="block text-sm mb-1">
                {label}
            </label>
            <div className="flex items-center border-b border-gray-400 py-1 relative">
                <IconComponent className="text-gray-500 mr-2" />
                <input
                    id={name}
                    name={name}
                    type={isPassword && showPassword ? 'text' : type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    className="w-full outline-none bg-transparent pr-8"
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-0 text-gray-500"
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputField;
