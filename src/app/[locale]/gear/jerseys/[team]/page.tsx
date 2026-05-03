import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getAllTeams, getTeamBySlug } from '@/lib/data-service'
import { buildOGMeta, canonical, breadcrumbJsonLd } from '@/lib/og-utils'
import Badge from '@/components/ui/Badge'
import GlassCard from '@/components/ui/GlassCard'
import SectionHeader from '@/components/ui/SectionHeader'

export const revalidate = 3600

const AMAZON_ASSOCIATE_TAG = 'kickoracle-20'

function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_ASSOCIATE_TAG}`
}

/* ------------------------------------------------------------------ */
/*  Kit data — derived from real-world national team kits              */
/* ------------------------------------------------------------------ */

interface KitInfo {
  label: string
  primary: string
  secondary: string
  accent: string
  manufacturer: string
}

const TEAM_KIT_DATA: Record<string, { manufacturer: string; kits: [KitInfo, KitInfo, KitInfo] }> = {
  mexico:       { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#006847', secondary: '#FFFFFF', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#006847', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#006847', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  'south-africa': { manufacturer: 'Le Coq Sportif', kits: [
    { label: 'Home', primary: '#FFB81C', secondary: '#007749', accent: '#000000', manufacturer: 'Le Coq Sportif' },
    { label: 'Away', primary: '#007749', secondary: '#FFB81C', accent: '#FFFFFF', manufacturer: 'Le Coq Sportif' },
    { label: 'Third', primary: '#FFFFFF', secondary: '#007749', accent: '#FFB81C', manufacturer: 'Le Coq Sportif' },
  ]},
  'south-korea': { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#C60C30', secondary: '#FFFFFF', accent: '#003478', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C60C30', accent: '#003478', manufacturer: 'Nike' },
    { label: 'Third', primary: '#003478', secondary: '#C60C30', accent: '#FFFFFF', manufacturer: 'Nike' },
  ]},
  denmark:      { manufacturer: 'Hummel', kits: [
    { label: 'Home', primary: '#C8102E', secondary: '#FFFFFF', accent: '#C8102E', manufacturer: 'Hummel' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C8102E', accent: '#003087', manufacturer: 'Hummel' },
    { label: 'Third', primary: '#003087', secondary: '#C8102E', accent: '#FFFFFF', manufacturer: 'Hummel' },
  ]},
  usa:          { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#002868', accent: '#BF0A30', manufacturer: 'Nike' },
    { label: 'Away', primary: '#002868', secondary: '#FFFFFF', accent: '#BF0A30', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#BF0A30', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  canada:       { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FF0000', secondary: '#FFFFFF', accent: '#FF0000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#FF0000', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#000000', secondary: '#FF0000', accent: '#FFFFFF', manufacturer: 'Nike' },
  ]},
  argentina:    { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#75AADB', secondary: '#FFFFFF', accent: '#75AADB', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#5C2D91', secondary: '#FFFFFF', accent: '#D4AF37', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#75AADB', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  brazil:       { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFDF00', secondary: '#009C3B', accent: '#002776', manufacturer: 'Nike' },
    { label: 'Away', primary: '#002776', secondary: '#FFDF00', accent: '#FFFFFF', manufacturer: 'Nike' },
    { label: 'Third', primary: '#FFFFFF', secondary: '#009C3B', accent: '#FFDF00', manufacturer: 'Nike' },
  ]},
  france:       { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#002395', secondary: '#FFFFFF', accent: '#ED2939', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#002395', accent: '#ED2939', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#D4AF37', accent: '#002395', manufacturer: 'Nike' },
  ]},
  germany:      { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#000000', accent: '#DD0000', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#000000', secondary: '#FFFFFF', accent: '#DD0000', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#5C0029', secondary: '#D4AF37', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  spain:        { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#C60B1E', secondary: '#FFC400', accent: '#C60B1E', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFC400', secondary: '#C60B1E', accent: '#000000', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#003DA5', secondary: '#C60B1E', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  england:      { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#002366', accent: '#CF081F', manufacturer: 'Nike' },
    { label: 'Away', primary: '#002366', secondary: '#FFFFFF', accent: '#CF081F', manufacturer: 'Nike' },
    { label: 'Third', primary: '#7B1C3A', secondary: '#FFFFFF', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  portugal:     { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FF0000', secondary: '#006600', accent: '#FCD116', manufacturer: 'Nike' },
    { label: 'Away', primary: '#006600', secondary: '#FF0000', accent: '#FFFFFF', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#FF0000', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  netherlands:  { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FF6600', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#002B5C', secondary: '#FF6600', accent: '#FFFFFF', manufacturer: 'Nike' },
    { label: 'Third', primary: '#FFFFFF', secondary: '#FF6600', accent: '#002B5C', manufacturer: 'Nike' },
  ]},
  belgium:      { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#C8102E', secondary: '#000000', accent: '#FCD116', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C8102E', accent: '#FCD116', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#000000', secondary: '#C8102E', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  italy:        { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#0055A4', secondary: '#FFFFFF', accent: '#008C45', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#0055A4', accent: '#008C45', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#008C45', secondary: '#0055A4', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  colombia:     { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#FCD116', secondary: '#003893', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#003893', secondary: '#FCD116', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#CE1126', secondary: '#003893', accent: '#FCD116', manufacturer: 'Adidas' },
  ]},
  uruguay:      { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#5DADE2', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Puma' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#5DADE2', accent: '#000000', manufacturer: 'Puma' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#5DADE2', accent: '#D4AF37', manufacturer: 'Puma' },
  ]},
  japan:        { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#002B5C', secondary: '#FFFFFF', accent: '#BC002D', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#002B5C', accent: '#BC002D', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#5C2D91', secondary: '#002B5C', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  australia:    { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFCD00', secondary: '#008751', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#008751', secondary: '#FFCD00', accent: '#FFFFFF', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#FFCD00', accent: '#008751', manufacturer: 'Nike' },
  ]},
  nigeria:      { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#008751', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#008751', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#000000', secondary: '#008751', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  senegal:      { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#009639', accent: '#EF3340', manufacturer: 'Puma' },
    { label: 'Away', primary: '#009639', secondary: '#FFFFFF', accent: '#EF3340', manufacturer: 'Puma' },
    { label: 'Third', primary: '#EF3340', secondary: '#009639', accent: '#FFFFFF', manufacturer: 'Puma' },
  ]},
  morocco:      { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#C1272D', secondary: '#006233', accent: '#FFFFFF', manufacturer: 'Puma' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C1272D', accent: '#006233', manufacturer: 'Puma' },
    { label: 'Third', primary: '#006233', secondary: '#C1272D', accent: '#D4AF37', manufacturer: 'Puma' },
  ]},
  croatia:      { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FF0000', secondary: '#FFFFFF', accent: '#171796', manufacturer: 'Nike' },
    { label: 'Away', primary: '#171796', secondary: '#FFFFFF', accent: '#FF0000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#000000', secondary: '#FF0000', accent: '#FFFFFF', manufacturer: 'Nike' },
  ]},
  switzerland:  { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#D52B1E', secondary: '#FFFFFF', accent: '#D52B1E', manufacturer: 'Puma' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#D52B1E', accent: '#000000', manufacturer: 'Puma' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#D52B1E', accent: '#D4AF37', manufacturer: 'Puma' },
  ]},
  serbia:       { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#C6363C', secondary: '#FFFFFF', accent: '#21357B', manufacturer: 'Puma' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C6363C', accent: '#21357B', manufacturer: 'Puma' },
    { label: 'Third', primary: '#21357B', secondary: '#C6363C', accent: '#FFFFFF', manufacturer: 'Puma' },
  ]},
  cameroon:     { manufacturer: 'One All Sports', kits: [
    { label: 'Home', primary: '#007A3D', secondary: '#CE1126', accent: '#FCD116', manufacturer: 'One All Sports' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#007A3D', accent: '#CE1126', manufacturer: 'One All Sports' },
    { label: 'Third', primary: '#CE1126', secondary: '#007A3D', accent: '#FCD116', manufacturer: 'One All Sports' },
  ]},
  ecuador:      { manufacturer: 'Marathon', kits: [
    { label: 'Home', primary: '#FFD100', secondary: '#034EA2', accent: '#CE1126', manufacturer: 'Marathon' },
    { label: 'Away', primary: '#034EA2', secondary: '#FFD100', accent: '#FFFFFF', manufacturer: 'Marathon' },
    { label: 'Third', primary: '#FFFFFF', secondary: '#034EA2', accent: '#FFD100', manufacturer: 'Marathon' },
  ]},
  'saudi-arabia': { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#006C35', secondary: '#FFFFFF', accent: '#006C35', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#006C35', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#006C35', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  iran:         { manufacturer: 'Majid', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#C8102E', accent: '#009B3A', manufacturer: 'Majid' },
    { label: 'Away', primary: '#C8102E', secondary: '#FFFFFF', accent: '#009B3A', manufacturer: 'Majid' },
    { label: 'Third', primary: '#009B3A', secondary: '#C8102E', accent: '#FFFFFF', manufacturer: 'Majid' },
  ]},
  qatar:        { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#8B0000', secondary: '#FFFFFF', accent: '#8B0000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#8B0000', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#000000', secondary: '#8B0000', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  ghana:        { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#006B3F', accent: '#CE1126', manufacturer: 'Puma' },
    { label: 'Away', primary: '#000000', secondary: '#FCD116', accent: '#006B3F', manufacturer: 'Puma' },
    { label: 'Third', primary: '#CE1126', secondary: '#FCD116', accent: '#006B3F', manufacturer: 'Puma' },
  ]},
  wales:        { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#C8102E', secondary: '#FFFFFF', accent: '#00A651', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C8102E', accent: '#00A651', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#00A651', secondary: '#C8102E', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  tunisia:      { manufacturer: 'Kappa', kits: [
    { label: 'Home', primary: '#C8102E', secondary: '#FFFFFF', accent: '#C8102E', manufacturer: 'Kappa' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#C8102E', accent: '#000000', manufacturer: 'Kappa' },
    { label: 'Third', primary: '#000000', secondary: '#C8102E', accent: '#D4AF37', manufacturer: 'Kappa' },
  ]},
  poland:       { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#DC143C', accent: '#DC143C', manufacturer: 'Nike' },
    { label: 'Away', primary: '#DC143C', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#DC143C', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
  'costa-rica': { manufacturer: 'New Balance', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#FFFFFF', accent: '#002B7F', manufacturer: 'New Balance' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#002B7F', manufacturer: 'New Balance' },
    { label: 'Third', primary: '#002B7F', secondary: '#CE1126', accent: '#FFFFFF', manufacturer: 'New Balance' },
  ]},
  paraguay:     { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#FFFFFF', accent: '#0038A8', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#0038A8', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#0038A8', secondary: '#CE1126', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  chile:        { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#D52B1E', secondary: '#FFFFFF', accent: '#0039A6', manufacturer: 'Nike' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#D52B1E', accent: '#0039A6', manufacturer: 'Nike' },
    { label: 'Third', primary: '#0039A6', secondary: '#D52B1E', accent: '#FFFFFF', manufacturer: 'Nike' },
  ]},
  peru:         { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#D91023', accent: '#D91023', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#D91023', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#D91023', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  bolivia:      { manufacturer: 'Marathon', kits: [
    { label: 'Home', primary: '#007A3D', secondary: '#FCD116', accent: '#CE1126', manufacturer: 'Marathon' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#007A3D', accent: '#CE1126', manufacturer: 'Marathon' },
    { label: 'Third', primary: '#CE1126', secondary: '#007A3D', accent: '#FCD116', manufacturer: 'Marathon' },
  ]},
  venezuela:    { manufacturer: 'Givova', kits: [
    { label: 'Home', primary: '#8B0000', secondary: '#FFFFFF', accent: '#002B7F', manufacturer: 'Givova' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#8B0000', accent: '#002B7F', manufacturer: 'Givova' },
    { label: 'Third', primary: '#002B7F', secondary: '#8B0000', accent: '#FFFFFF', manufacturer: 'Givova' },
  ]},
  honduras:     { manufacturer: 'Joma', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#0051A5', accent: '#0051A5', manufacturer: 'Joma' },
    { label: 'Away', primary: '#0051A5', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Joma' },
    { label: 'Third', primary: '#000000', secondary: '#0051A5', accent: '#FFFFFF', manufacturer: 'Joma' },
  ]},
  jamaica:      { manufacturer: 'Umbro', kits: [
    { label: 'Home', primary: '#FFD100', secondary: '#009B3A', accent: '#000000', manufacturer: 'Umbro' },
    { label: 'Away', primary: '#000000', secondary: '#FFD100', accent: '#009B3A', manufacturer: 'Umbro' },
    { label: 'Third', primary: '#009B3A', secondary: '#FFD100', accent: '#000000', manufacturer: 'Umbro' },
  ]},
  'trinidad-and-tobago': { manufacturer: 'BOL', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#000000', accent: '#FFFFFF', manufacturer: 'BOL' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#000000', manufacturer: 'BOL' },
    { label: 'Third', primary: '#000000', secondary: '#CE1126', accent: '#FFFFFF', manufacturer: 'BOL' },
  ]},
  egypt:        { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Puma' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#000000', manufacturer: 'Puma' },
    { label: 'Third', primary: '#000000', secondary: '#CE1126', accent: '#D4AF37', manufacturer: 'Puma' },
  ]},
  'ivory-coast': { manufacturer: 'Puma', kits: [
    { label: 'Home', primary: '#FF8200', secondary: '#009C3B', accent: '#FFFFFF', manufacturer: 'Puma' },
    { label: 'Away', primary: '#009C3B', secondary: '#FF8200', accent: '#FFFFFF', manufacturer: 'Puma' },
    { label: 'Third', primary: '#FFFFFF', secondary: '#FF8200', accent: '#009C3B', manufacturer: 'Puma' },
  ]},
  algeria:      { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#006233', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#006233', secondary: '#FFFFFF', accent: '#CE1126', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#006233', accent: '#D4AF37', manufacturer: 'Adidas' },
  ]},
  'burkina-faso': { manufacturer: 'Tovio', kits: [
    { label: 'Home', primary: '#009E49', secondary: '#EF2B2D', accent: '#FCD116', manufacturer: 'Tovio' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#009E49', accent: '#EF2B2D', manufacturer: 'Tovio' },
    { label: 'Third', primary: '#EF2B2D', secondary: '#009E49', accent: '#FCD116', manufacturer: 'Tovio' },
  ]},
  mali:         { manufacturer: 'Airness', kits: [
    { label: 'Home', primary: '#14B53A', secondary: '#FCD116', accent: '#CE1126', manufacturer: 'Airness' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#14B53A', accent: '#CE1126', manufacturer: 'Airness' },
    { label: 'Third', primary: '#CE1126', secondary: '#14B53A', accent: '#FCD116', manufacturer: 'Airness' },
  ]},
  uzbekistan:   { manufacturer: 'Jako', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#1EB53A', accent: '#0099B5', manufacturer: 'Jako' },
    { label: 'Away', primary: '#0099B5', secondary: '#FFFFFF', accent: '#1EB53A', manufacturer: 'Jako' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#0099B5', accent: '#1EB53A', manufacturer: 'Jako' },
  ]},
  indonesia:    { manufacturer: 'Mills', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000', manufacturer: 'Mills' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#000000', manufacturer: 'Mills' },
    { label: 'Third', primary: '#000000', secondary: '#CE1126', accent: '#D4AF37', manufacturer: 'Mills' },
  ]},
  'new-zealand': { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#000000', accent: '#000000', manufacturer: 'Nike' },
    { label: 'Away', primary: '#000000', secondary: '#FFFFFF', accent: '#FFFFFF', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#FFFFFF', accent: '#C0C0C0', manufacturer: 'Nike' },
  ]},
  panama:       { manufacturer: 'New Balance', kits: [
    { label: 'Home', primary: '#CE1126', secondary: '#FFFFFF', accent: '#003DA5', manufacturer: 'New Balance' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#CE1126', accent: '#003DA5', manufacturer: 'New Balance' },
    { label: 'Third', primary: '#003DA5', secondary: '#CE1126', accent: '#FFFFFF', manufacturer: 'New Balance' },
  ]},
  scotland:     { manufacturer: 'Adidas', kits: [
    { label: 'Home', primary: '#003087', secondary: '#FFFFFF', accent: '#003087', manufacturer: 'Adidas' },
    { label: 'Away', primary: '#FFFFFF', secondary: '#003087', accent: '#CF4520', manufacturer: 'Adidas' },
    { label: 'Third', primary: '#CF4520', secondary: '#003087', accent: '#FFFFFF', manufacturer: 'Adidas' },
  ]},
  slovenia:     { manufacturer: 'Nike', kits: [
    { label: 'Home', primary: '#FFFFFF', secondary: '#005DA6', accent: '#ED1C24', manufacturer: 'Nike' },
    { label: 'Away', primary: '#005DA6', secondary: '#FFFFFF', accent: '#ED1C24', manufacturer: 'Nike' },
    { label: 'Third', primary: '#1A1A2E', secondary: '#005DA6', accent: '#D4AF37', manufacturer: 'Nike' },
  ]},
}

/* ------------------------------------------------------------------ */
/*  Fallback kit generator for teams not in the lookup                 */
/* ------------------------------------------------------------------ */

function generateFallbackKits(teamSlug: string): { manufacturer: string; kits: [KitInfo, KitInfo, KitInfo] } {
  // Deterministic hash for consistent colors
  let hash = 5381
  for (let i = 0; i < teamSlug.length; i++) {
    hash = ((hash << 5) + hash + teamSlug.charCodeAt(i)) | 0
  }
  const h = Math.abs(hash)
  const hue = h % 360
  const primary = `hsl(${hue}, 70%, 45%)`
  const secondary = '#FFFFFF'
  const accent = `hsl(${(hue + 180) % 360}, 60%, 40%)`

  return {
    manufacturer: 'TBC',
    kits: [
      { label: 'Home', primary, secondary, accent, manufacturer: 'TBC' },
      { label: 'Away', primary: secondary, secondary: primary, accent, manufacturer: 'TBC' },
      { label: 'Third', primary: '#1A1A2E', secondary: primary, accent: '#D4AF37', manufacturer: 'TBC' },
    ],
  }
}

function getTeamKits(slug: string): { manufacturer: string; kits: [KitInfo, KitInfo, KitInfo] } {
  return TEAM_KIT_DATA[slug] ?? generateFallbackKits(slug)
}

/* ------------------------------------------------------------------ */
/*  Size guide data                                                    */
/* ------------------------------------------------------------------ */

const SIZE_GUIDE = [
  { size: 'S', chest: '34-36"', waist: '28-30"', cmChest: '86-91', cmWaist: '71-76' },
  { size: 'M', chest: '38-40"', waist: '32-34"', cmChest: '97-102', cmWaist: '81-86' },
  { size: 'L', chest: '42-44"', waist: '36-38"', cmChest: '107-112', cmWaist: '91-97' },
  { size: 'XL', chest: '46-48"', waist: '40-42"', cmChest: '117-122', cmWaist: '102-107' },
  { size: '2XL', chest: '50-52"', waist: '44-46"', cmChest: '127-132', cmWaist: '112-117' },
  { size: '3XL', chest: '54-56"', waist: '48-50"', cmChest: '137-142', cmWaist: '122-127' },
]

/* ------------------------------------------------------------------ */
/*  Jersey SVG silhouette component                                   */
/* ------------------------------------------------------------------ */

function JerseySilhouette({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <svg viewBox="0 0 200 240" className="w-full h-auto max-w-[180px]" aria-hidden="true">
      {/* Body */}
      <path
        d="M60 60 L60 220 Q60 230 70 230 L130 230 Q140 230 140 220 L140 60 Z"
        fill={primary}
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.95"
      />
      {/* Left sleeve */}
      <path
        d="M60 60 L20 85 L20 120 Q20 125 25 125 L50 125 L60 110 Z"
        fill={secondary}
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Right sleeve */}
      <path
        d="M140 60 L180 85 L180 120 Q180 125 175 125 L150 125 L140 110 Z"
        fill={secondary}
        stroke={accent}
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Collar */}
      <path
        d="M75 55 Q100 75 125 55 L130 60 Q100 82 70 60 Z"
        fill={accent}
        opacity="0.85"
      />
      {/* Shoulder seam left */}
      <line x1="60" y1="60" x2="75" y2="55" stroke={accent} strokeWidth="1" opacity="0.5" />
      {/* Shoulder seam right */}
      <line x1="140" y1="60" x2="125" y2="55" stroke={accent} strokeWidth="1" opacity="0.5" />
      {/* Subtle chest stripe */}
      <rect x="70" y="120" width="60" height="3" rx="1.5" fill={accent} opacity="0.3" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Static params + Metadata                                           */
/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ team: string; locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { team: slug, locale } = await params
  const team = getTeamBySlug(slug)
  if (!team) {
    return { title: 'Team Not Found' }
  }

  const t = await getTranslations({ locale, namespace: 'jerseyPage' })
  const kitData = getTeamKits(slug)
  const title = `${team.name} Jersey — World Cup 2026 Kit | Home, Away & Third`
  const description = `${team.name} World Cup 2026 home, away, and third kits by ${kitData.manufacturer}. Buy authentic ${team.name} jerseys from trusted retailers. Size guide, color details, and where to buy.`
  const url = canonical(`/gear/jerseys/${slug}`)

  return {
    title,
    description,
    keywords: `${team.name} jersey, ${team.name} World Cup 2026 kit, ${team.name} home kit, ${team.name} away kit, ${kitData.manufacturer} ${team.name}, World Cup 2026 jerseys, football kit`,
    alternates: { canonical: url },
    ...buildOGMeta({
      title,
      description,
      url,
      type: 'article',
      section: t('gearBadge'),
    }),
  }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function TeamJerseyPage({ params }: PageProps) {
  const { team: slug, locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('jerseyPage')

  const team = getTeamBySlug(slug)
  if (!team) notFound()

  const kitData = getTeamKits(slug)
  const { manufacturer, kits } = kitData

  // Gather a few neighbor teams from the same group for navigation
  const allTeams = getAllTeams()
  const groupTeams = allTeams.filter((gt) => gt.group === team.group && gt.slug !== slug).slice(0, 3)

  const crumbs = breadcrumbJsonLd([
    { name: t('homeBreadcrumb'), url: canonical('/') },
    { name: t('gearBreadcrumb'), url: canonical('/gear') },
    { name: t('jerseysBreadcrumb'), url: canonical('/gear/jerseys') },
    { name: `${team.name} Kit`, url: canonical(`/gear/jerseys/${slug}`) },
  ])

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      {/* ── Hero ── */}
      <section className="relative py-24 md:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 max-w-[1440px] mx-auto text-center">
          <Badge variant="secondary" size="md">{t('gearBadge')}</Badge>
          <p className="text-7xl mt-6 mb-2" aria-label={`${team.name} flag`}>{team.flag}</p>
          <h1 className="font-headline text-5xl md:text-8xl tracking-wide uppercase mb-3">
            {team.name} <span className="text-primary">{t('jerseys')}</span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {manufacturer !== 'TBC'
              ? t('kitDescriptionBy', { manufacturer })
              : t('kitDescription')}
          </p>

          {/* Breadcrumb nav */}
          <nav aria-label="Breadcrumb" className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">{t('homeBreadcrumb')}</Link>
            <span className="opacity-40">/</span>
            <Link href="/gear" className="hover:text-primary transition-colors">{t('gearBreadcrumb')}</Link>
            <span className="opacity-40">/</span>
            <Link href="/gear/jerseys" className="hover:text-primary transition-colors">{t('jerseysBreadcrumb')}</Link>
            <span className="opacity-40">/</span>
            <span className="text-on-surface">{team.name}</span>
          </nav>
        </div>
      </section>

      {/* ── Kit display ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-16">
        <SectionHeader className="mb-10">{t('kitCollection')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kits.map((kit) => (
            <GlassCard key={kit.label} className="p-6 md:p-8 flex flex-col items-center gap-6" hover>
              {/* Jersey silhouette */}
              <div className="relative w-full flex justify-center py-4">
                <div className="absolute inset-0 rounded-xl opacity-10" style={{ background: `radial-gradient(circle at 50% 40%, ${kit.primary}, transparent 70%)` }} />
                <JerseySilhouette primary={kit.primary} secondary={kit.secondary} accent={kit.accent} />
              </div>

              {/* Kit info */}
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-2xl tracking-wide uppercase">
                    {t(kit.label === 'Home' ? 'homeKit' : kit.label === 'Away' ? 'awayKit' : 'thirdKit')}
                  </h3>
                  <Badge variant={kit.label === 'Home' ? 'primary' : kit.label === 'Away' ? 'secondary' : 'tertiary'} size="sm">
                    {kit.label}
                  </Badge>
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('colors')}</span>
                  <div className="flex gap-2">
                    {[kit.primary, kit.secondary, kit.accent].map((color, i) => (
                      <div key={i} className="relative group">
                        <div
                          className="w-7 h-7 rounded-full border border-white/20 shadow-lg"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {color}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manufacturer */}
                <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
                  <span className="uppercase tracking-wider">{t('manufacturer')}</span>
                  <span className="text-on-surface">{kit.manufacturer}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Kit manufacturer info ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-16">
        <SectionHeader className="mb-8">{t('kitManufacturer')}</SectionHeader>
        <GlassCard className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-headline text-2xl tracking-wide uppercase mb-4">{manufacturer}</h3>
              <p className="text-on-surface-variant leading-relaxed">
                {team.name}&apos;s World Cup 2026 kits are {manufacturer !== 'TBC' ? `manufactured by ${manufacturer}` : 'yet to be officially confirmed'}.
                {manufacturer !== 'TBC' && (
                  <> The partnership brings together {manufacturer}&apos;s technical expertise with {team.name}&apos;s rich footballing heritage, delivering performance fabrics with breathable moisture-wicking technology designed for the demands of tournament football in North American summer conditions.</>
                )}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('brand')}</span>
                <span className="font-label text-on-surface">{manufacturer}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('tournament')}</span>
                <span className="font-label text-on-surface">{t('tournament')}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('teamLabel')}</span>
                <span className="font-label text-on-surface">{team.flag} {team.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('confederation')}</span>
                <span className="font-label text-on-surface">{team.confederation}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{t('groupLabel', { group: team.group })}</span>
                <span className="font-label text-on-surface">{t('groupLabel', { group: team.group })}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ── Where to buy ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-16">
        <SectionHeader className="mb-8">{t('whereToBuy')}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[
            {
              retailer: 'Amazon Fan Gear',
              tag: 'Amazon',
              url: amazonSearchUrl(`${team.name} ${manufacturer} World Cup jersey`),
              variant: 'primary' as const,
            },
            { retailer: 'Official FIFA Store', tag: t('official'), url: '#', variant: 'primary' as const },
            { retailer: `${manufacturer} Store`, tag: t('manufacturerStore'), url: '#', variant: 'secondary' as const },
            { retailer: 'World Soccer Shop', tag: t('specialist'), url: '#', variant: 'tertiary' as const },
            { retailer: 'Soccer.com', tag: t('wideSelection'), url: '#', variant: 'outline' as const },
          ].map((store) => {
            const isExternal = store.url.startsWith('http')

            return (
              <GlassCard key={store.retailer} className="p-5 flex flex-col gap-3" hover>
                <Badge variant={store.variant} size="sm">{store.tag}</Badge>
                <h3 className="font-label text-sm uppercase tracking-wider text-on-surface">{store.retailer}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed flex-1">
                  {t('authenticJerseys', { team: team.name })}
                </p>
                <a
                  href={store.url}
                  data-affiliate={`${slug}-${store.retailer.toLowerCase().replace(/\s+/g, '-')}`}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'sponsored noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-xs font-label uppercase tracking-widest hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  {t('shopNow')}
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </GlassCard>
            )
          })}
        </div>
        <p className="text-[10px] text-on-surface-variant/60 mt-4 font-mono">
          {t('affiliateDisclaimer')}
        </p>
      </section>

      {/* ── Size guide ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-16">
        <SectionHeader className="mb-8">{t('sizeGuide')}</SectionHeader>
        <GlassCard className="p-6 md:p-8 overflow-x-auto">
          <p className="text-on-surface-variant text-sm mb-6">
            {t('sizeGuideDesc')}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left py-3 pr-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">{t('sizeLabel')}</th>
                <th className="text-left py-3 pr-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">{t('chestIn')}</th>
                <th className="text-left py-3 pr-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">{t('waistIn')}</th>
                <th className="text-left py-3 pr-4 font-label text-xs uppercase tracking-widest text-on-surface-variant">{t('chestCm')}</th>
                <th className="text-left py-3 font-label text-xs uppercase tracking-widest text-on-surface-variant">{t('waistCm')}</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE.map((row) => (
                <tr key={row.size} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 pr-4 font-headline text-base text-on-surface">{row.size}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-on-surface-variant">{row.chest}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-on-surface-variant">{row.waist}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-on-surface-variant">{row.cmChest}</td>
                  <td className="py-3 font-mono text-xs text-on-surface-variant">{row.cmWaist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </section>

      {/* ── Navigation ── */}
      <section className="max-w-[1440px] mx-auto px-6 pb-24">
        <SectionHeader className="mb-8">{t('exploreMore')}</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team page link */}
          <Link href={`/teams/${slug}`} className="group">
            <GlassCard className="p-6 hover:bg-surface-bright transition-all h-full" hover>
              <Badge variant="primary" size="sm">{t('teamBadge')}</Badge>
              <p className="text-5xl mt-4 mb-3">{team.flag}</p>
              <h3 className="font-headline text-xl tracking-wide uppercase group-hover:text-primary transition-colors">
                {team.name} Squad
              </h3>
              <p className="text-xs text-on-surface-variant mt-2">
                {t('fullSquad')}
              </p>
            </GlassCard>
          </Link>

          {/* Other team jerseys from same group */}
          <GlassCard className="p-6">
            <Badge variant="secondary" size="sm">{t('groupLabel', { group: team.group })}</Badge>
            <h3 className="font-headline text-xl tracking-wide uppercase mt-4 mb-4">{t('groupKits')}</h3>
            <div className="space-y-2">
              {groupTeams.map((gt) => (
                <Link
                  key={gt.slug}
                  href={`/gear/jerseys/${gt.slug}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="text-xl">{gt.flag}</span>
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">
                    {gt.name}
                  </span>
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Back to all jerseys */}
          <Link href="/gear/jerseys" className="group">
            <GlassCard className="p-6 hover:bg-surface-bright transition-all h-full flex flex-col justify-between" hover>
              <div>
                <Badge variant="outline" size="sm">{t('allTeams')}</Badge>
                <h3 className="font-headline text-xl tracking-wide uppercase mt-4 mb-2 group-hover:text-primary transition-colors">
                  {t('allTeamKits')}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {t('browseAllJerseys')}
                </p>
              </div>
              <span className="text-primary text-sm font-label uppercase tracking-widest mt-4 inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {t('viewAll')} <span aria-hidden="true">&rarr;</span>
              </span>
            </GlassCard>
          </Link>
        </div>
      </section>
    </>
  )
}
