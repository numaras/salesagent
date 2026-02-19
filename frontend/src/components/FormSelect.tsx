interface Option { value: string; label: string }

interface Props extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: Option[];
  placeholder?: string;
}

export default function FormSelect({ options, placeholder, ...rest }: Props) {
  return (
    <select {...rest} className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${rest.className ?? ""}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
