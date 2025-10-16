import { Link as RouterLink } from 'react-router-dom';

export default function Link({ href, children, ...props }) {
  // Support both string href and object with pathname/search
  const to = href || props.to;
  return (
    <RouterLink to={to} {...props}>
      {children}
    </RouterLink>
  );
}