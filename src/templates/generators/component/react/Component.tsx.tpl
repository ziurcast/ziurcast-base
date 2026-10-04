import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

type {{componentName}}Props = Omit<HTMLAttributes<HTMLDivElement>, 'className'> & {
  classNames?: Readonly<{
    root?: string;
  }>;
};

export const {{componentName}} = ({ classNames, ...rootProps }: {{componentName}}Props) => (
  <div {...rootProps} className={clsx(classNames?.root)} />
);
