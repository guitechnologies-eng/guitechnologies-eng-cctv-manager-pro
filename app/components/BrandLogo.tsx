import Image from 'next/image'

/** The uploaded, original GUI Technologies mark; never redrawn or replaced. */
export default function BrandLogo({
 size=48,className='',priority=false
}:{size?:number;className?:string;priority?:boolean}){
 return <Image
  src="/brand-logo"
  alt="GUI Technologies original company logo"
  width={size}
  height={size}
  priority={priority}
  unoptimized
  className={'gui-brand-logo '+className}
 />
}
