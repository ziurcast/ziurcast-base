'use client';

import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  classNames?: Readonly<{
    root?: string;
  }>;
};

export const Button = ({ classNames, ...buttonProps }: ButtonProps) => (
  <button {...buttonProps} className={clsx(classNames?.root)} />
);
