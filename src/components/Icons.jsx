/* Small inline icons (no extra library needed) */

function Svg({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BagIcon = (props) => (
  <Svg {...props}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Svg>
);

/* shopping cart (trolley) - used for "Add to cart" and the cart button */
export const CartIcon = (props) => (
  <Svg {...props}>
    <path d="M2.8 4.2h2.4l2 10.1a1.7 1.7 0 0 0 1.7 1.4h8.3a1.7 1.7 0 0 0 1.7-1.3l1.4-6.2H6.2" />
    <circle cx="9.6" cy="19.4" r="1.45" />
    <circle cx="17" cy="19.4" r="1.45" />
  </Svg>
);

export const PlayIcon = (props) => (
  <Svg {...props} fill="currentColor" strokeWidth="0">
    <path d="M8 5.6v12.8a.9.9 0 0 0 1.4.8l10-6.4a.9.9 0 0 0 0-1.5l-10-6.4A.9.9 0 0 0 8 5.6Z" />
  </Svg>
);

export const SearchIcon = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="m16 16 4.2 4.2" />
  </Svg>
);

export const BellIcon = (props) => (
  <Svg {...props}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </Svg>
);

export const CameraIcon = (props) => (
  <Svg {...props}>
    <path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4v-10Z" />
    <circle cx="12" cy="13.3" r="3.2" />
  </Svg>
);

export const UserIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c.6-4 3.5-6 7.5-6s6.9 2 7.5 6" />
  </Svg>
);

export const MenuIcon = (props) => (
  <Svg {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const CloseIcon = (props) => (
  <Svg {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const HeartIcon = ({ filled, ...props }) => (
  <Svg {...props} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Svg>
);

export const CheckIcon = (props) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const TruckIcon = (props) => (
  <Svg {...props}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Svg>
);

export const FacebookIcon = (props) => (
  <Svg {...props}>
    <path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.2H8V14h2.5v6H14v-6h2.5l.5-3.8H14V8.4c0-.2.1-.4.4-.4Z" />
  </Svg>
);

export const InstagramIcon = (props) => (
  <Svg {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="16.8" cy="7.2" r=".6" fill="currentColor" />
  </Svg>
);

export const TiktokIcon = (props) => (
  <Svg {...props}>
    <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 4c.4 2.3 1.9 3.8 4.5 4" />
  </Svg>
);

export const YoutubeIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="6" width="18" height="12" rx="3.5" />
    <path d="m10.5 9.5 4 2.5-4 2.5v-5Z" />
  </Svg>
);

export const WhatsappIcon = (props) => (
  <Svg {...props}>
    <path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19L4 20Z" />
    <path d="M9.2 8.6c.2 2.4 2.6 4.8 5.2 5.2l1.1-1.2-1.8-.9-.8.6c-.9-.4-1.8-1.3-2.2-2.2l.6-.8-.9-1.8-1.2 1.1Z" />
  </Svg>
);

export const MessengerIcon = (props) => (
  <Svg {...props}>
    <path d="M12 4C7.6 4 4 7.2 4 11.3c0 2.3 1.1 4.3 2.9 5.7V20l2.8-1.5c.7.2 1.5.3 2.3.3 4.4 0 8-3.2 8-7.5S16.4 4 12 4Z" />
    <path d="m8 13.2 2.7-3 2 1.6 2.6-1.8" />
  </Svg>
);

export const PhoneIcon = (props) => (
  <Svg {...props}>
    <path d="M6.5 4.5h3l1.2 3.4-1.8 1.2a10 10 0 0 0 4.2 4.2l1.2-1.8 3.4 1.2v3a1.8 1.8 0 0 1-2 1.8A13.5 13.5 0 0 1 4.7 6.5a1.8 1.8 0 0 1 1.8-2Z" />
  </Svg>
);

export const MailIcon = (props) => (
  <Svg {...props}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
  </Svg>
);
