import { type ComponentType, type JSX, lazy, Suspense } from "react";

type DynamicLoader<TProps extends object> = () => Promise<{
	default: ComponentType<TProps>;
}>;

type DynamicOptions = {
	loading?: ComponentType;
	ssr?: boolean;
};

export default function dynamic<
	TProps extends object = Record<string, unknown>,
>(
	loader: DynamicLoader<TProps>,
	options: DynamicOptions = {},
): ComponentType<TProps> {
	const LazyComponent = lazy(loader);

	const DynamicComponent = (props: TProps): JSX.Element => (
		<Suspense fallback={options.loading ? <options.loading /> : null}>
			<LazyComponent {...(props as TProps & JSX.IntrinsicAttributes)} />
		</Suspense>
	);

	return DynamicComponent as ComponentType<TProps>;
}
