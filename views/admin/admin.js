const deleteCategory =async(id)=>{
   try {
    console.log("script page delete category function")
        let response = await fetch(`/admin/category/${id}`,{
            method:'PATCH',
            headers:{
                'Content-Type':"application/json"
            },
            body:JSON.stringify({status:false})
        })
        if(response.ok){
            window.location.reload()
        }else{
            console.log("error deleting the category")
        }
   } catch (error) {
    console.log(error)
   }
}