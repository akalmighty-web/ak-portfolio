import { faInstagram, faLinkedin, faArtstation, faSquareBehance } from '@fortawesome/free-brands-svg-icons'
import { SOCIALS } from '../config'

const BRANDS = {
  instagram: { icon: faInstagram, label: 'Instagram' },
  linkedin: { icon: faLinkedin, label: 'LinkedIn' },
  artstation: { icon: faArtstation, label: 'ArtStation' },
  behance: { icon: faSquareBehance, label: 'Behance' },
}

export function BrandIcon({ name, ...props }) {
  const [w, h, , , d] = BRANDS[name].icon.icon
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" {...props}>
      <path fill="currentColor" d={d} />
    </svg>
  )
}

export function SocialLinks({ order = ['instagram', 'linkedin', 'artstation', 'behance'], className }) {
  return (
    <ul className={className}>
      {order.map((name) => (
        <li key={name}>
          <a href={SOCIALS[name]} target="_blank" rel="noopener noreferrer" aria-label={BRANDS[name].label}>
            <BrandIcon name={name} />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Hand-drawn marker strokes used across the site. */
export const Underline = (props) => (
  <svg viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M3 10.6c9-2.6 25-5.2 44-6.4 22-1.4 45-.6 69 2.4 1.6.2 1.8 2.4.2 2.6-23-2.6-45-3.2-67-1.8-18 1.2-32 3.4-44 6.2-2.6.6-4.6-2.2-2.2-3z"
    />
  </svg>
)

export const ArrowDoodle = (props) => (
  <svg viewBox="0 0 40 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M3 12.5c9-.8 21-1.4 33-1.2" />
    <path d="M27.5 4.5c3.4 2.4 6.4 4.4 9 6.8-3 2-6.2 4.2-9.4 7" />
  </svg>
)
