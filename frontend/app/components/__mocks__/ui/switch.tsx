import React from 'react';

export const Switch = ({ onCheckedChange, ...props }: any) => (
  <input type="checkbox" onChange={e => onCheckedChange(e.target.checked)} {...props} />
); 