import { ComponentType, lazy, Suspense } from "react";

type DynamicLoader<TProps> = () => Promise<{ default: ComponentType<TProps> }>;

type DynamicOptions = {
	loading?: ComponentType;
	ssr?: boolean;
};

export default function dynamic<TProps = Record<string, unknown>>(
	loader: DynamicLoader<TProps>,
	options: DynamicOptions = {},
): ComponentType<TProps> {
	const LazyComponent = lazy(loader);

	const DynamicComponent = (props: TProps) => (
		<Suspense fallback={options.loading ? <options.loading /> : null}>
			<LazyComponent {...props} />
		</Suspense>
	);

	return DynamicComponent as ComponentType<TProps>;
}

