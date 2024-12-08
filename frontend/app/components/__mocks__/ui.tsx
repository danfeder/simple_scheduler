import React from 'react';

export const Button = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>{children}</button>
);

export const Input = ({ onChange, ...props }: any) => (
  <input onChange={onChange} {...props} />
);

export const Label = ({ children, ...props }: any) => (
  <label {...props}>{children}</label>
);

export const Switch = ({ onCheckedChange, ...props }: any) => (
  <input type="checkbox" onChange={e => onCheckedChange(e.target.checked)} {...props} />
);

export const Card = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardHeader = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const CardTitle = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const toast = {
  title: '',
  description: '',
  variant: '',
}; 