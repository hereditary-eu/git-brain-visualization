import { vtkAlgorithm, vtkObject } from '@kitware/vtk.js/interfaces';

export const LINE_ARRAY: number[];

export interface IImageImageMarchingCubesFilterInitialValues {}

type vtkImageMarchingCubesBase = vtkObject & vtkAlgorithm;

export interface vtkImageMarchingCubes
  extends vtkImageMarchingCubesBase {
}

/**
 * Method used to decorate a given object (publicAPI+model) with
 * vtkImageDataOutlineFilter characteristics.
 *
 * @param publicAPI object on which methods will be bounds (public)
 * @param model object on which data structure will be bounds (protected)
 * @param {IImageDataOutlineFilterInitialValues} [initialValues] (default: {})
 */
export function extend(
  publicAPI: object,
  model: object,
  initialValues?: IImageImageMarchingCubesFilterInitialValues
): void;

/**
 * Method used to create a new instance of vtkImageDataOutlineFilter
 * @param {IImageDataOutlineFilterInitialValues} [initialValues] for pre-setting some of its content
 */
export function newInstance(
  initialValues?: IImageImageMarchingCubesFilterInitialValues
): vtkImageMarchingCubes;

/**
 * vtkImageDataOutlineFilter - A filter that generates oriented outline for
 * vtkImageData.
 *
 * vtkImageDataOutlineFilter is a filter that generates a wireframe or
 * triangulated rectangular-cuboid as an outline of an input vtkImageData.
 * It takes into account the orientation / DirectionMatrix of the image, so the
 * output outline may not be axes aligned.
 *
 */
export declare const vtkImageMarchingCubes: {
  newInstance: typeof newInstance;
  extend: typeof extend;
};
export default vtkImageMarchingCubes;
