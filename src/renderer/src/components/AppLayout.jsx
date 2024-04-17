import { forwardRef } from 'react';

// Utility function to merge class names
const mergeClasses = (...classes) => {
  return classes.filter(Boolean).join(' ');
}

export const RootLayout = ({ children, className, ...props }) => {
  return (
    <main className={mergeClasses('flex flex-row h-screen', className)} {...props}>
      {children}
    </main>
  );
}

export const Sidebar = ({ className, children, ...props }) => {
  return (
    <aside
      className={mergeClasses('w-[250px] h-[100vh + 10px] overflow-auto', className)}
      {...props}
    >
      {children}
    </aside>
  );
}

export const Content = forwardRef((props, ref) => {
  const { children, className, ...restProps } = props;
  return (
    <div ref={ref} className={mergeClasses('flex-1 overflow-auto', className)} {...restProps}>
      {children}
    </div>
  );
});

Content.displayName = 'Content';