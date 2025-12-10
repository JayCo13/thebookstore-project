import { Link as RouterLink } from 'react-router-dom';

export default function Link({ href, children, ...props }) {
  // Support both string href and object with pathname/search
  const to = href || props.to;
  const isExternal = typeof to === 'string' && /^https?:\/\//.test(to);
  if (isExternal) {
    const { to: _omitTo, href: _omitHref, ...rest } = props;
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={to} {...props}>
      {children}
    </RouterLink>
  );
}
