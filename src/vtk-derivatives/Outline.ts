import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData"
import vtkOutlineFilter from "@kitware/vtk.js/Filters/General/OutlineFilter"
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor"
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper"

/**
 * Creates an outline around a image data bounds
 * This contains a partial and enclosed pipeline, only the input data can be set
 */
class Outline {
    public filter: vtkOutlineFilter
    public mapper: vtkMapper
    public actor: vtkActor

    constructor(data?: vtkImageData,){
        this.filter = vtkOutlineFilter.newInstance();
        this.mapper = vtkMapper.newInstance();
        this.mapper.setInputConnection(this.filter.getOutputPort());
        this.actor = vtkActor.newInstance();
        this.actor.setMapper(this.mapper);
        this.actor.getProperty().set({
          diffuseColor: [0, 1, 1],
          lineWidth: 2,
        });  

        if(data){
            this.filter.setInputData(data)
        }
    }

    public setInputData(data: vtkImageData){
        this.filter.setInputData(data)
    }

    get visible(){
        return this.actor.getVisibility()
    }

    set visible(value:boolean){
        this.actor.setVisibility(value)
    }
}

export default Outline