import { Hero } from '@/components/profile/Hero'
import { Bio } from '@/components/profile/Bio'
import { Stack } from '@/components/profile/Stack'
import { SocialLinks } from '@/components/profile/SocialLinks'

export default function ProfilePage() {
  return (
    <div className="space-y-16">
      <Hero />
      <Bio />
      <Stack />
      <SocialLinks />
    </div>
  )
}
