import React from 'react';

export const Input = ({ onChange, ...props }: any) => (
  <input onChange={onChange} {...props} />
); 