
const dynamicBreadcrumb = async(req,res,next)=>{
    const path = req.path
    const parts = path.split('/').filter(part =>part)
    const breadcrumb = []
    let currentPath = ''

    parts.forEach((part,index)=>{
        currentPath += `\${part}`
        breadcrumb.push({
            label: part.charAt(0).toUpperCase() + part.slice(1),
            url: currentPath,
            isLast : index === parts.length -1
        })
    })

    res.locals.breadcrumbs = breadcrumb;
    next();
}
module.exports = dynamicBreadcrumb