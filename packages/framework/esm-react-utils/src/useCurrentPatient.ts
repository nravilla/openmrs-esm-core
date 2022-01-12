import { useEffect, useReducer } from "react";
import { fetchCurrentPatient, PatientUuid } from "@openmrs/esm-api";

console.log("here I am!");

type NullablePatient = fhir.Patient | null;

interface CurrentPatientState {
  patientUuid: string | null;
  patient: NullablePatient;
  isLoadingPatient: boolean;
  err: Error | null;
}

interface LoadPatient {
  type: ActionTypes.loadPatient;
  patientUuid: string | null;
}

interface NewPatient {
  type: ActionTypes.newPatient;
  patient: NullablePatient;
}

interface PatientLoadError {
  type: ActionTypes.loadError;
  err: Error | null;
}

type Action = LoadPatient | NewPatient | PatientLoadError;

enum ActionTypes {
  loadPatient = "loadPatient",
  newPatient = "newPatient",
  loadError = "patientLloadErroroadError",
}

const initialState: CurrentPatientState = {
  patientUuid: null,
  patient: null,
  isLoadingPatient: true,
  err: null,
};

function getPatientUuidFromUrl(): PatientUuid {
  const match = /\/patient\/([a-zA-Z0-9\-]+)\/?/.exec(location.pathname);
  return match && match[1];
}

function reducer(
  state: CurrentPatientState,
  action: Action
): CurrentPatientState {
  switch (action.type) {
    case ActionTypes.loadPatient:
      return {
        ...state,
        patientUuid: action.patientUuid,
        patient: null,
        isLoadingPatient: true,
        err: null,
      };
    case ActionTypes.newPatient:
      return {
        ...state,
        patient: action.patient,
        isLoadingPatient: false,
        err: null,
      };
    case ActionTypes.loadError:
      return {
        ...state,
        patient: null,
        isLoadingPatient: false,
        err: action.err,
      };
    default:
      return state;
  }
}

/**
 * This React hook returns a patient object. If the `patientUuid` is provided
 * as a parameter, then the patient for that UUID is returned. If the parameter
 * is not provided, the patient UUID is obtained from the current route, and
 * a route listener is set up to update the patient whenever the route changes.
 */
export function useCurrentPatient(patientUuid?: string) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    patientUuid: patientUuid ?? null,
  });

  useEffect(() => {
    if (state.patientUuid) {
      dispatch({
        type: ActionTypes.loadPatient,
        patientUuid: state.patientUuid,
      });
    } else {
      const patientUuidFromUrl = getPatientUuidFromUrl();
      if (patientUuidFromUrl) {
        dispatch({
          type: ActionTypes.loadPatient,
          patientUuid: patientUuidFromUrl,
        });
      } else {
        dispatch({ type: ActionTypes.newPatient, patient: null });
      }
    }
  }, [state.patientUuid]);

  useEffect(() => {
    let active = true;
    if (state.isLoadingPatient && state.patientUuid) {
      fetchCurrentPatient(state.patientUuid).then(
        (patient) =>
          active &&
          dispatch({
            patient: patient.data,
            type: ActionTypes.newPatient,
          }),
        (err) =>
          active &&
          dispatch({
            err,
            type: ActionTypes.loadError,
          })
      );
    }
    return () => {
      active = false;
    };
  }, [state.isLoadingPatient, state.patientUuid]);

  useEffect(() => {
    const handleRouteUpdate = (evt) => {
      dispatch({
        type: ActionTypes.loadPatient,
        patientUuid: getPatientUuidFromUrl(),
      });
    };
    window.addEventListener("single-spa:routing-event", handleRouteUpdate);
    return () =>
      window.removeEventListener("single-spa:routing-event", handleRouteUpdate);
  }, []);

  console.log(state);
  return {
    isLoading: state.isLoadingPatient,
    patient: state.patient,
    patientUuid: patientUuid ?? null,
    error: state.err,
  };
}
