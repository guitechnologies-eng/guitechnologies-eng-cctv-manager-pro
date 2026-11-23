/**
 * Only show the navigation loader for same-origin page or query changes.
 * Hash-only links and external destinations should remain immediate.
 */
export function shouldShowNavigationFeedback(currentHref:string,nextHref:string):boolean{
 try{
  const from=new URL(currentHref)
  const to=new URL(nextHref,from)
  return from.origin===to.origin &&
   (from.pathname!==to.pathname||from.search!==to.search)
 }catch{
  return false
 }
}
